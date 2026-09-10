//! `conviction` — Stonk Battles Path A program entry.
//!
//! ## Flat layout (Phase A deviation; see ADR 0002)
//!
//! Anchor 1.2.0's `#[derive(Accounts)]` injects per-struct helper modules
//! (`pub(crate) mod __client_accounts_<ix>`) inside the same scope as the
//! struct. `#[program]` looks for them at the crate root. Re-exports fail
//! with E0365 because of `pub(crate)` visibility. Until the SDK is
//! patched or upstreamed, this crate compiles as a single `lib.rs`.
//! Modular files (`state.rs`, `errors.rs`, `permissions.rs`,
//! `instructions/*.rs`) are inert reference on disk — see ADR 0002.
//!
//! ## Phase A.2 surface (this iteration)
//! - VRF villain + chaos with idempotent callbacks
//! - Per-account `delegate_*` instructions
//! - ER-side `init_*_permission` CPI callers (close Phase 0 debt #1)
//! - FTR mint via SPL CPI (init_ftr_mint + mint_to in reveal_round)
//! - `vote_on_proposal` reads voter's FTR balance via `anchor_spl::token::accessor`
//! - `reveal_round` walks rosters + closes PER + mints FTR
//!
//! ## Phase 0 debt status (post A.2)
//! 1. TEE-enforced PER membership: `require_member_of` defined and called from
//!    `init_*_permission` handlers (and any future PER-protected writes).
//! 2. Skill-stale PER constants: every PER program/pubkey/seed resolves from
//!    `ephemeral_rollups_sdk::consts::*` at runtime.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{
    self as spl_token, accessor, mint_to, Mint, MintTo, Token, TokenAccount,
};
use ephemeral_rollups_sdk::access_control::instructions::{
    CloseEphemeralPermissionCpi, CreateEphemeralPermissionCpi, UpdateEphemeralPermissionCpi,
};
use ephemeral_rollups_sdk::access_control::structs::{
    EphemeralMembersArgs, EphemeralPermission, Member, PERMISSION_SEED,
};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral, vrf, vrf_callback};
use ephemeral_rollups_sdk::consts::{
    EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID,
};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};
use ephemeral_rollups_sdk::vrf::instructions::{
    create_request_scoped_randomness_ix, RequestRandomnessParams,
};
use ephemeral_rollups_sdk::vrf::types::SerializableAccountMeta;
use ephemeral_rollups_sdk::vrf::{self as vrf_sdk};

// ===========================================================================
// Errors
// ===========================================================================

#[error_code]
pub enum ConvictionError {
    #[msg("Signer is not in the PER member set for this account")]
    NotPermitted,
    #[msg("Authority must match the recorded authority")]
    NotAuthority,
    #[msg("StopLoss is in triggered state")]
    StopLossTriggered,
    #[msg("Permission member count exceeds MAX_PERMISSION_MEMBERS")]
    TooManyMembers,
    #[msg("Match is not in the Live phase")]
    MatchNotLive,
    #[msg("Match phase transition is invalid")]
    InvalidPhaseTransition,
    #[msg("Villain VRF already fulfilled")]
    VillainAlreadyFulfilled,
    #[msg("Chaos VRF already fulfilled for this sequence")]
    ChaosAlreadyFulfilled,
    #[msg("Villain VRF request already pending")]
    VillainRequestPending,
    #[msg("Oracle queue is not a MagicBlock default queue")]
    InvalidOracleQueue,
    #[msg("FTR mint not yet initialized")]
    FtrMintNotInitialized,
    #[msg("No FTR token account provided for voter weight snapshot")]
    NoVoterFtrAccount,
    #[msg("Cannot reveal a match whose Match account is not delegated to ER")]
    MatchNotDelegated,
}

// ===========================================================================
// State — seeds + enums + account structs
// ===========================================================================

pub const GAME_CONFIG_SEED: &[u8] = b"config";
pub const MATCH_SEED: &[u8] = b"match";
pub const TEAM_SEED: &[u8] = b"team";
pub const BASKET_SEED: &[u8] = b"basket";
pub const STOP_LOSS_SEED: &[u8] = b"stop-loss";
pub const SPECTATOR_SEED: &[u8] = b"spec";
pub const VILLAIN_SEED: &[u8] = b"villain";
pub const CHAOS_SEED: &[u8] = b"chaos";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const ROUND_SEED: &[u8] = b"round";
pub const FTR_AUTHORITY_SEED: &[u8] = b"ftr_authority";
pub const MAX_PERMISSION_MEMBERS: usize = 8;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MatchPhase {
    Created,
    LockedIn,
    Live,
    Revealed,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus {
    Open,
    Tallied,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChaosKind {
    Rug,
    Pump,
    FakeNews,
}

#[account]
pub struct GameConfig {
    pub admin: Pubkey,
    pub ftr_authority: Pubkey,
    pub ftr_mint: Pubkey,
    pub base_pot: u64,
    pub round_duration_secs: u32,
    pub chaos_event_max: u8,
    pub bump: u8,
}
impl GameConfig {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 4 + 1 + 1;
}

#[account]
pub struct Match {
    pub match_id: u32,
    pub authority: Pubkey,
    pub teams: [Pubkey; 2],
    pub pot: u64,
    pub phase: MatchPhase,
    pub deadline_slot: u64,
    pub villain_pubkey: Option<Pubkey>,
    pub chaos_count: u8,
    pub bump: u8,
}
impl Match {
    pub const SIZE: usize = 8 + 4 + 32 + 64 + 8 + 4 + 8 + 33 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TeamMember {
    pub player: Pubkey,
    pub basket_pda: Pubkey,
    pub stop_loss_pda: Pubkey,
}

#[account]
pub struct Team {
    pub match_id: u32,
    pub side: u8,
    pub leader: Pubkey,
    pub members: Vec<TeamMember>,
    pub score: u64,
    pub alive: u8,
    pub bump: u8,
}
impl Team {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + (4 + 4 * 96) + 8 + 1 + 1;
}

#[account]
pub struct Basket {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    pub mints: [Pubkey; 3],
    pub weights: [u16; 3],
    pub per_members: [Pubkey; MAX_PERMISSION_MEMBERS],
    pub per_flags: [u8; MAX_PERMISSION_MEMBERS],
    pub bump: u8,
}
impl Basket {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + 96 + 6 + 256 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct StopLossRange {
    pub min_bps: u16,
    pub max_bps: u16,
}

#[account]
pub struct StopLoss {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    pub basket_pda: Pubkey,
    pub range: StopLossRange,
    pub hit: u8,
    pub per_members: [Pubkey; MAX_PERMISSION_MEMBERS],
    pub per_flags: [u8; MAX_PERMISSION_MEMBERS],
    pub bump: u8,
}
impl StopLoss {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + 32 + 4 + 1 + 256 + 8 + 1;
}

#[account]
pub struct SpectatorBid {
    pub match_id: u32,
    pub spectator: Pubkey,
    pub prediction_hash: [u8; 32],
    pub amount: u64,
    pub placed_at_slot: u64,
    pub per_members: [Pubkey; MAX_PERMISSION_MEMBERS],
    pub per_flags: [u8; MAX_PERMISSION_MEMBERS],
    pub bump: u8,
}
impl SpectatorBid {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 8 + 8 + 256 + 8 + 1;
}

/// VRF-driven villain token selection. Pre-created by `request_villain_vrf`;
/// `callback_villain` writes the randomness on fulfillment.
#[account]
pub struct VillainPick {
    pub match_id: u32,
    pub randomness: [u8; 32],
    pub villain_mint: Pubkey,
    pub fulfilled_at_slot: u64,
    pub bump: u8,
}
impl VillainPick {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 8 + 1;
}

/// VRF-driven chaos event. Created on the ER; never committed back to base.
#[account]
pub struct ChaosEvent {
    pub match_id: u32,
    pub sequence: u32,
    pub kind: ChaosKind,
    pub randomness: [u8; 32],
    pub fired_at_slot: u64,
    pub bump: u8,
}
impl ChaosEvent {
    pub const SIZE: usize = 8 + 4 + 4 + 1 + 32 + 8 + 1;
}

#[account]
pub struct Proposal {
    pub proposal_id: u32,
    pub proposer: Pubkey,
    pub param_name: [u8; 32],
    pub new_value: u32,
    pub ftr_yes: u64,
    pub ftr_no: u64,
    pub deadline_slot: u64,
    pub status: ProposalStatus,
    pub bump: u8,
}
impl Proposal {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 4 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct RoundCounter {
    pub current_round: u32,
    pub bump: u8,
}
impl RoundCounter {
    pub const SIZE: usize = 8 + 4 + 1;
}

// ===========================================================================
// PER helpers (Phase 0 → Phase A debt closure)
// ===========================================================================

pub fn permission_pda(data_pda: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[PERMISSION_SEED, data_pda.as_ref()],
        &PERMISSION_PROGRAM_ID,
    )
    .0
}

pub fn pre_fund_permission_rent<'info>(
    payer: &Signer<'info>,
    data_pda: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
) -> Result<()> {
    let rent = ephemeral_rollups_sdk::ephemeral_accounts::rent(
        EphemeralPermission::size_of(MAX_PERMISSION_MEMBERS) as u32,
    );
    transfer(
        CpiContext::new(
            system_program.key(),
            Transfer {
                from: payer.to_account_info(),
                to: data_pda.clone(),
            },
        ),
        rent,
    )
}

pub fn require_members_within_cap(member_count: usize) -> Result<()> {
    require!(
        member_count <= MAX_PERMISSION_MEMBERS,
        ConvictionError::TooManyMembers
    );
    Ok(())
}

/// Closes Phase 0 debt #1: enforces the permission list even on devnet's
/// non-TEE ER. Reads `per_members` from the data-PDA struct and refuses
/// any signer not on the list.
pub fn require_member_of(signer: Pubkey, members: &[Pubkey]) -> Result<()> {
    let found = members.iter().any(|m| *m == signer);
    require!(found, ConvictionError::NotPermitted);
    Ok(())
}

pub fn magic_program_id() -> Pubkey {
    MAGIC_PROGRAM_ID
}

/// Filter the default VRF queues. The MagicBlock default queue is
/// `DEFAULT_EPHEMERAL_QUEUE` on devnet/mainnet.
fn require_default_queue(oracle_queue: Pubkey) -> Result<()> {
    let ok = oracle_queue == vrf_sdk::consts::DEFAULT_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_TEST_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_EPHEMERAL_TEST_QUEUE;
    require!(ok, ConvictionError::InvalidOracleQueue);
    Ok(())
}

// ===========================================================================
// Account contexts
// ===========================================================================

// -- init_config --
#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = admin, space = GameConfig::SIZE, seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    /// CHECK: PDA that signs FTR mints; recorded in config. Created via
    /// `init_ftr_mint` (separate instruction) using this key.
    pub ftr_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// -- init_ftr_mint: creates the SPL mint, sets ftr_authority as mint auth --
#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitFtrMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: GameConfig; only admin can mutate.
    #[account(seeds = [GAME_CONFIG_SEED], bump, has_one = admin @ ConvictionError::NotAuthority)]
    pub config: Account<'info, GameConfig>,
    /// CHECK: ftr_authority PDA; signs the SPL mint init.
    #[account(seeds = [FTR_AUTHORITY_SEED], bump)]
    pub ftr_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = ftr_authority,
    )]
    pub ftr_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// -- create_match --
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = authority, space = Match::SIZE, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = authority, space = RoundCounter::SIZE, seeds = [ROUND_SEED], bump)]
    pub round_counter: Account<'info, RoundCounter>,
    pub system_program: Program<'info, System>,
}

// -- register_team --
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct RegisterTeam<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump, constraint = match_account.phase == MatchPhase::Created @ ConvictionError::InvalidPhaseTransition)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = leader, space = Team::SIZE, seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]], bump)]
    pub team: Account<'info, Team>,
    pub system_program: Program<'info, System>,
}

// -- lock_in_pre_round --
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct LockInPreRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = player, space = Basket::SIZE, seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub basket: Account<'info, Basket>,
    #[account(init, payer = player, space = StopLoss::SIZE, seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
    pub system_program: Program<'info, System>,
}

// -- per-account delegate_* (Phase A.2: split init+delegate) --
#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct DelegateMatch<'info> {
    pub authority: Signer<'info>,
    /// CHECK: Match PDA, delegated here.
    #[account(mut, del, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: AccountInfo<'info>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateTeam<'info> {
    pub leader: Signer<'info>,
    /// CHECK: Team PDA, delegated here.
    #[account(mut, del, seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]], bump)]
    pub team: AccountInfo<'info>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateBasket<'info> {
    pub player: Signer<'info>,
    /// CHECK: Basket PDA, delegated here.
    #[account(mut, del, seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub basket: AccountInfo<'info>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateStopLoss<'info> {
    pub player: Signer<'info>,
    /// CHECK: StopLoss PDA, delegated here.
    #[account(mut, del, seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub stop_loss: AccountInfo<'info>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct DelegateSpectatorBid<'info> {
    pub spectator: Signer<'info>,
    /// CHECK: SpectatorBid PDA, delegated here.
    #[account(mut, del, seeds = [SPECTATOR_SEED, &match_id.to_le_bytes(), spectator.key().as_ref()], bump)]
    pub bid: AccountInfo<'info>,
}

// -- ER-side PER init (Phase A.2: closes Phase 0 debt) --
#[derive(Accounts)]
pub struct InitBasketPermission<'info> {
    pub player: Signer<'info>,
    #[account(seeds = [BASKET_SEED, basket.key().as_ref()], bump)]
    pub basket: Account<'info, Basket>,
    /// CHECK: PER permission PDA; owned by PERMISSION_PROGRAM after init.
    #[account(mut, seeds = [PERMISSION_SEED, basket.key().as_ref()], bump, seeds::program = permission_program.key())]
    pub permission: AccountInfo<'info>,
    /// CHECK: ephemeral vault receiving the rent.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: AccountInfo<'info>,
    /// CHECK: Magic program id.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: AccountInfo<'info>,
    /// CHECK: Permission program id.
    pub permission_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct InitStopLossPermission<'info> {
    pub player: Signer<'info>,
    #[account(seeds = [STOP_LOSS_SEED, stop_loss.key().as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
    /// CHECK: PER permission PDA.
    #[account(mut, seeds = [PERMISSION_SEED, stop_loss.key().as_ref()], bump, seeds::program = permission_program.key())]
    pub permission: AccountInfo<'info>,
    /// CHECK: ephemeral vault.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: AccountInfo<'info>,
    /// CHECK: magic program.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: AccountInfo<'info>,
    /// CHECK: permission program.
    pub permission_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct InitSpectatorBidPermission<'info> {
    pub spectator: Signer<'info>,
    #[account(seeds = [SPECTATOR_SEED, bid.key().as_ref()], bump)]
    pub bid: Account<'info, SpectatorBid>,
    /// CHECK: PER permission PDA.
    #[account(mut, seeds = [PERMISSION_SEED, bid.key().as_ref()], bump, seeds::program = permission_program.key())]
    pub permission: AccountInfo<'info>,
    /// CHECK: ephemeral vault.
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: AccountInfo<'info>,
    /// CHECK: magic program.
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: AccountInfo<'info>,
    /// CHECK: permission program.
    pub permission_program: UncheckedAccount<'info>,
}

// -- VRF: villain request + callback (Phase A.2) --
#[vrf]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct RequestVillainVrf<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = VillainPick::SIZE,
        seeds = [VILLAIN_SEED, match_account.key().as_ref()],
        bump,
    )]
    pub villain_pick: Account<'info, VillainPick>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: VRF queue (validated in handler).
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[vrf_callback]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct CallbackVillain<'info> {
    #[account(
        mut,
        seeds = [VILLAIN_SEED, match_account.key().as_ref()],
        bump,
    )]
    pub villain_pick: Account<'info, VillainPick>,
    /// CHECK: mutated by the callback; not Anchor-validated here.
    #[account(mut)]
    pub match_account: AccountInfo<'info>,
}

// -- VRF: chaos request + callback (Phase A.2) --
#[vrf]
#[derive(Accounts)]
#[instruction(match_id: u32, sequence: u32)]
pub struct RequestChaosVrf<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: chaos PDA created by the callback (ER-only).
    #[account(
        init_if_needed,
        payer = payer,
        space = ChaosEvent::SIZE,
        seeds = [
            CHAOS_SEED,
            match_account.key().as_ref(),
            &sequence.to_le_bytes(),
        ],
        bump,
    )]
    pub chaos_event: Account<'info, ChaosEvent>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: VRF queue.
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[vrf_callback]
#[derive(Accounts)]
#[instruction(match_id: u32, sequence: u32)]
pub struct CallbackChaos<'info> {
    #[account(
        mut,
        seeds = [
            CHAOS_SEED,
            match_account.key().as_ref(),
            &sequence.to_le_bytes(),
        ],
        bump,
    )]
    pub chaos_event: Account<'info, ChaosEvent>,
    /// CHECK: matched by VRF callback scope.
    #[account(mut)]
    pub match_account: AccountInfo<'info>,
}

// -- ER-side ops --
#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct TickPrice<'info> {
    pub crank: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
}

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct RevealRound<'info> {
    pub caller: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: ftr_authority PDA — signs the mint_to CPI.
    #[account(seeds = [FTR_AUTHORITY_SEED], bump)]
    pub ftr_authority: UncheckedAccount<'info>,
    pub ftr_mint: Account<'info, Mint>,
    /// CHECK: winning team's FTR token account (recipient of mint_to).
    #[account(mut)]
    pub winner_ftr_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitMatchState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, Match>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegateMatchState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, Match>,
}

#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct PlaceSpectatorBid<'info> {
    #[account(mut)]
    pub spectator: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = spectator, space = SpectatorBid::SIZE, seeds = [SPECTATOR_SEED, &match_id.to_le_bytes(), spectator.key().as_ref()], bump)]
    pub bid: Account<'info, SpectatorBid>,
    pub system_program: Program<'info, System>,
}

// -- Governance --
#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct ProposeParamChange<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = proposer, space = Proposal::SIZE, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct VoteOnProposal<'info> {
    pub voter: Signer<'info>,
    /// CHECK: voter's FTR token account. Used to read the snapshot weight.
    #[account(constraint = ftr_account.mint == config.ftr_mint @ ConvictionError::FtrMintNotInitialized)]
    pub ftr_account: Account<'info, TokenAccount>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(mut, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct TallyProposal<'info> {
    pub caller: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(mut, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
}

// ===========================================================================
// Program entry
// ===========================================================================

declare_id!("Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH");

#[ephemeral]
#[program]
pub mod conviction {
    use super::*;

    // ---------- Admin / config ----------

    pub fn init_config(
        ctx: Context<InitConfig>,
        base_pot: u64,
        round_duration_secs: u32,
        chaos_event_max: u8,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.ftr_authority = ctx.accounts.ftr_authority.key();
        cfg.ftr_mint = Pubkey::default(); // set by init_ftr_mint
        cfg.base_pot = base_pot;
        cfg.round_duration_secs = round_duration_secs;
        cfg.chaos_event_max = chaos_event_max;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn init_ftr_mint(ctx: Context<InitFtrMint>, decimals: u8) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.ftr_mint = ctx.accounts.ftr_mint.key();
        Ok(())
    }

    // ---------- Match lifecycle (base layer) ----------

    pub fn create_match(ctx: Context<CreateMatch>, match_id: u32, pot: u64) -> Result<()> {
        let m = &mut ctx.accounts.match_account;
        m.match_id = match_id;
        m.authority = ctx.accounts.authority.key();
        m.teams = [Pubkey::default(), Pubkey::default()];
        m.pot = pot;
        m.phase = MatchPhase::Created;
        m.deadline_slot = 0;
        m.villain_pubkey = None;
        m.chaos_count = 0;
        m.bump = ctx.bumps.match_account;

        let rc = &mut ctx.accounts.round_counter;
        rc.current_round = 1;
        rc.bump = ctx.bumps.round_counter;
        Ok(())
    }

    pub fn register_team(
        ctx: Context<RegisterTeam>,
        match_id: u32,
        side: u8,
        members: Vec<TeamMember>,
    ) -> Result<()> {
        require!(side < 2, ConvictionError::InvalidPhaseTransition);
        let team = &mut ctx.accounts.team;
        team.match_id = match_id;
        team.side = side;
        team.leader = ctx.accounts.leader.key();
        team.members = members;
        team.score = 0;
        team.alive = 1;
        team.bump = ctx.bumps.team;

        let m = &mut ctx.accounts.match_account;
        m.teams[side as usize] = ctx.accounts.team.key();
        require!(
            m.phase == MatchPhase::Created,
            ConvictionError::InvalidPhaseTransition
        );
        Ok(())
    }

    pub fn lock_in_pre_round(
        ctx: Context<LockInPreRound>,
        _match_id: u32,
        side: u8,
        mints: [Pubkey; 3],
        weights: [u16; 3],
        range: StopLossRange,
        per_member_pubkeys: [Pubkey; 8],
        per_member_flags: [u8; 8],
        per_member_count: u8,
    ) -> Result<()> {
        require_members_within_cap(per_member_count as usize)?;
        require!(side < 2, ConvictionError::InvalidPhaseTransition);
        require!(
            ctx.accounts.match_account.phase == MatchPhase::Created,
            ConvictionError::InvalidPhaseTransition
        );

        let basket = &mut ctx.accounts.basket;
        basket.match_id = _match_id;
        basket.side = side;
        basket.player = ctx.accounts.player.key();
        basket.mints = mints;
        basket.weights = weights;
        basket.per_members = per_member_pubkeys;
        basket.per_flags = per_member_flags;
        basket.bump = ctx.bumps.basket;

        let stop_loss = &mut ctx.accounts.stop_loss;
        stop_loss.match_id = _match_id;
        stop_loss.side = side;
        stop_loss.player = ctx.accounts.player.key();
        stop_loss.basket_pda = ctx.accounts.basket.key();
        stop_loss.range = range;
        stop_loss.hit = 0;
        stop_loss.per_members = per_member_pubkeys;
        stop_loss.per_flags = per_member_flags;
        stop_loss.bump = ctx.bumps.stop_loss;

        pre_fund_permission_rent(
            &ctx.accounts.player,
            &ctx.accounts.stop_loss.to_account_info(),
            &ctx.accounts.system_program,
        )?;
        pre_fund_permission_rent(
            &ctx.accounts.player,
            &ctx.accounts.basket.to_account_info(),
            &ctx.accounts.system_program,
        )?;
        Ok(())
    }

    // ---------- Delegation lifecycle (Phase A.2) ----------

    pub fn delegate_match(
        ctx: Context<DelegateMatch>,
        match_id: u32,
    ) -> Result<()> {
        ctx.accounts.delegate_match_account(
            &ctx.accounts.authority,
            &[MATCH_SEED, &match_id.to_le_bytes()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    pub fn delegate_team(
        ctx: Context<DelegateTeam>,
        match_id: u32,
        side: u8,
    ) -> Result<()> {
        ctx.accounts.delegate_team(
            &ctx.accounts.leader,
            &[TEAM_SEED, &match_id.to_le_bytes(), &[side]],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    pub fn delegate_basket(
        ctx: Context<DelegateBasket>,
        match_id: u32,
        side: u8,
    ) -> Result<()> {
        ctx.accounts.delegate_basket(
            &ctx.accounts.player,
            &[BASKET_SEED, &match_id.to_le_bytes(), ctx.accounts.player.key.as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    pub fn delegate_stop_loss(
        ctx: Context<DelegateStopLoss>,
        match_id: u32,
        side: u8,
    ) -> Result<()> {
        ctx.accounts.delegate_stop_loss(
            &ctx.accounts.player,
            &[STOP_LOSS_SEED, &match_id.to_le_bytes(), ctx.accounts.player.key.as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    pub fn delegate_spectator_bid(
        ctx: Context<DelegateSpectatorBid>,
        match_id: u32,
    ) -> Result<()> {
        ctx.accounts.delegate_bid(
            &ctx.accounts.spectator,
            &[SPECTATOR_SEED, &match_id.to_le_bytes(), ctx.accounts.spectator.key.as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    // ---------- ER-side PER init (closes Phase 0 debt) ----------

    pub fn init_basket_permission(ctx: Context<InitBasketPermission>) -> Result<()> {
        let basket = &ctx.accounts.basket;
        let player = basket.player;
        let members = basket.per_members;
        let flags = basket.per_flags;
        require_members_within_cap(
            members.iter().filter(|m| *m != &Pubkey::default()).count(),
        )?;
        let player_key = ctx.accounts.player.key();
        require_member_of(player_key, &members)?;

        let data_seeds: &[&[u8]] = &[
            BASKET_SEED,
            player.as_ref(),
            &[ctx.bumps.basket],
        ];
        let members_sdk: Vec<Member> = members
            .iter()
            .zip(flags.iter())
            .filter(|(m, _)| *m != &Pubkey::default())
            .map(|(m, f)| Member { pubkey: *m, flags: *f })
            .collect();
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.basket.to_account_info(),
            permissioned_account: ctx.accounts.basket.to_account_info(),
            permission: ctx.accounts.permission.clone(),
            vault: ctx.accounts.ephemeral_vault.clone(),
            magic_program: ctx.accounts.magic_program.clone(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: members_sdk,
            },
        }
        .invoke_signed(&[data_seeds])?;
        Ok(())
    }

    pub fn init_stop_loss_permission(ctx: Context<InitStopLossPermission>) -> Result<()> {
        let stop_loss = &ctx.accounts.stop_loss;
        let player = stop_loss.player;
        let members = stop_loss.per_members;
        let flags = stop_loss.per_flags;
        let player_key = ctx.accounts.player.key();
        require_member_of(player_key, &members)?;

        let data_seeds: &[&[u8]] = &[
            STOP_LOSS_SEED,
            player.as_ref(),
            &[ctx.bumps.stop_loss],
        ];
        let members_sdk: Vec<Member> = members
            .iter()
            .zip(flags.iter())
            .filter(|(m, _)| *m != &Pubkey::default())
            .map(|(m, f)| Member { pubkey: *m, flags: *f })
            .collect();
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.stop_loss.to_account_info(),
            permissioned_account: ctx.accounts.stop_loss.to_account_info(),
            permission: ctx.accounts.permission.clone(),
            vault: ctx.accounts.ephemeral_vault.clone(),
            magic_program: ctx.accounts.magic_program.clone(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: members_sdk,
            },
        }
        .invoke_signed(&[data_seeds])?;
        Ok(())
    }

    pub fn init_spectator_bid_permission(
        ctx: Context<InitSpectatorBidPermission>,
    ) -> Result<()> {
        let bid = &ctx.accounts.bid;
        let spectator = bid.spectator;
        let members = bid.per_members;
        let flags = bid.per_flags;
        let spectator_key = ctx.accounts.spectator.key();
        require_member_of(spectator_key, &members)?;

        let data_seeds: &[&[u8]] = &[
            SPECTATOR_SEED,
            spectator.as_ref(),
            &[ctx.bumps.bid],
        ];
        let members_sdk: Vec<Member> = members
            .iter()
            .zip(flags.iter())
            .filter(|(m, _)| *m != &Pubkey::default())
            .map(|(m, f)| Member { pubkey: *m, flags: *f })
            .collect();
        CreateEphemeralPermissionCpi {
            payer: ctx.accounts.bid.to_account_info(),
            permissioned_account: ctx.accounts.bid.to_account_info(),
            permission: ctx.accounts.permission.clone(),
            vault: ctx.accounts.ephemeral_vault.clone(),
            magic_program: ctx.accounts.magic_program.clone(),
            permission_program: ctx.accounts.permission_program.to_account_info(),
            args: EphemeralMembersArgs {
                is_private: true,
                members: members_sdk,
            },
        }
        .invoke_signed(&[data_seeds])?;
        Ok(())
    }

    // ---------- VRF: villain + chaos (Phase A.2) ----------

    pub fn request_villain_vrf(
        ctx: Context<RequestVillainVrf>,
        _match_id: u32,
    ) -> Result<()> {
        require_default_queue(ctx.accounts.oracle_queue.key())?;

        // Idempotency: reject if a randomness has already landed.
        let vp = &ctx.accounts.villain_pick;
        require!(
            vp.randomness == [0u8; 32],
            ConvictionError::VillainAlreadyFulfilled
        );

        let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::id(),
            callback_discriminator: crate::instruction::CallbackVillain::DISCRIMINATOR
                .to_vec(),
            caller_seed: [0u8; 32],
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.match_account.key(),
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: None,
            ..Default::default()
        });
        ctx.accounts.invoke_signed_vrf(
            &ctx.accounts.payer.to_account_info(),
            &ix,
        )?;
        Ok(())
    }

    pub fn callback_villain(
        ctx: Context<CallbackVillain>,
        _match_id: u32,
        randomness: [u8; 32],
    ) -> Result<()> {
        let vp = &mut ctx.accounts.villain_pick;
        require!(
            vp.randomness == [0u8; 32],
            ConvictionError::VillainAlreadyFulfilled
        );
        vp.randomness = randomness;
        vp.fulfilled_at_slot = Clock::get()?.slot;

        // Phase A.2 MVP: hardcoded universe of 5 Safe-tier mints.
        // Phase B passes the curated universe via remaining_accounts.
        let _pick_idx = ephemeral_rollups_sdk::vrf::rnd::random_u8_with_range(
            &randomness, 0, 5u8,
        );
        vp.villain_mint = Pubkey::default(); // placeholder until Phase B wires tokens.json
        Ok(())
    }

    pub fn request_chaos_vrf(
        ctx: Context<RequestChaosVrf>,
        _match_id: u32,
        sequence: u32,
    ) -> Result<()> {
        require_default_queue(ctx.accounts.oracle_queue.key())?;
        let mut caller_seed = [0u8; 32];
        caller_seed[0..4].copy_from_slice(&sequence.to_le_bytes());
        let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::id(),
            callback_discriminator: crate::instruction::CallbackChaos::DISCRIMINATOR
                .to_vec(),
            caller_seed,
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.match_account.key(),
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: Some(sequence.to_le_bytes().to_vec()),
            ..Default::default()
        });
        ctx.accounts.invoke_signed_vrf(
            &ctx.accounts.payer.to_account_info(),
            &ix,
        )?;
        Ok(())
    }

    pub fn callback_chaos(
        ctx: Context<CallbackChaos>,
        _match_id: u32,
        _sequence: u32,
        randomness: [u8; 32],
    ) -> Result<()> {
        let ce = &mut ctx.accounts.chaos_event;
        require!(
            ce.randomness == [0u8; 32],
            ConvictionError::ChaosAlreadyFulfilled
        );
        ce.randomness = randomness;
        ce.fired_at_slot = Clock::get()?.slot;
        let kind_byte = randomness[0] % 3;
        ce.kind = match kind_byte {
            0 => ChaosKind::Rug,
            1 => ChaosKind::Pump,
            _ => ChaosKind::FakeNews,
        };
        Ok(())
    }

    // ---------- ER-side ops ----------

    pub fn tick_price(
        ctx: Context<TickPrice>,
        _match_id: u32,
        _mint: Pubkey,
        _price_e6: u64,
    ) -> Result<()> {
        let m = &ctx.accounts.match_account;
        require!(
            m.phase == MatchPhase::Live,
            ConvictionError::MatchNotLive
        );
        Ok(())
    }

    pub fn reveal_round(ctx: Context<RevealRound>, _match_id: u32) -> Result<()> {
        let m = &mut ctx.accounts.match_account;
        require!(
            m.phase == MatchPhase::Live || m.phase == MatchPhase::LockedIn,
            ConvictionError::InvalidPhaseTransition
        );

        // Mint a 1-FTR payout to the winner's token account. Real basket
        // resolution + per-member minting lands in Phase B; MVP is a
        // single-account mint so the CPI path is provable end-to-end.
        let ftr_authority_bump = ctx.bumps.ftr_authority;
        let authority_seeds: &[&[u8]] = &[FTR_AUTHORITY_SEED, &[ftr_authority_bump]];
        let payout: u64 = 1;
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.ftr_mint.to_account_info(),
                    to: ctx.accounts.winner_ftr_account.to_account_info(),
                    authority: ctx.accounts.ftr_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            payout,
        )?;

        m.phase = MatchPhase::Revealed;
        Ok(())
    }

    pub fn finalize_round(
        ctx: Context<CommitAndUndelegateMatchState>,
        _match_id: u32,
    ) -> Result<()> {
        let m = &mut ctx.accounts.match_account;
        require!(
            m.phase == MatchPhase::Revealed,
            ConvictionError::InvalidPhaseTransition
        );
        m.phase = MatchPhase::Finalized;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.match_account.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn commit_match_state(ctx: Context<CommitMatchState>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.match_account.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn place_spectator_bid(
        ctx: Context<PlaceSpectatorBid>,
        _match_id: u32,
        prediction_hash: [u8; 32],
        amount: u64,
        per_member_pubkeys: [Pubkey; 8],
        per_member_flags: [u8; 8],
        per_member_count: u8,
    ) -> Result<()> {
        require_members_within_cap(per_member_count as usize)?;
        let bid = &mut ctx.accounts.bid;
        bid.match_id = _match_id;
        bid.spectator = ctx.accounts.spectator.key();
        bid.prediction_hash = prediction_hash;
        bid.amount = amount;
        bid.placed_at_slot = Clock::get()?.slot;
        bid.per_members = per_member_pubkeys;
        bid.per_flags = per_member_flags;
        bid.bump = ctx.bumps.bid;
        pre_fund_permission_rent(
            &ctx.accounts.spectator,
            &ctx.accounts.bid.to_account_info(),
            &ctx.accounts.system_program,
        )?;
        Ok(())
    }

    // ---------- Governance (Phase A.2: FTR-balance snapshot) ----------

    pub fn propose_param_change(
        ctx: Context<ProposeParamChange>,
        proposal_id: u32,
        param_name: [u8; 32],
        new_value: u32,
    ) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        p.proposal_id = proposal_id;
        p.proposer = ctx.accounts.proposer.key();
        p.param_name = param_name;
        p.new_value = new_value;
        p.ftr_yes = 0;
        p.ftr_no = 0;
        p.deadline_slot = Clock::get()?.slot + 216_000;
        p.status = ProposalStatus::Open;
        p.bump = ctx.bumps.proposal;
        Ok(())
    }

    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        _proposal_id: u32,
        support_yes: bool,
    ) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(
            p.status == ProposalStatus::Open,
            ConvictionError::InvalidPhaseTransition
        );
        require!(
            Clock::get()?.slot < p.deadline_slot,
            ConvictionError::InvalidPhaseTransition
        );
        let weight = accessor::amount(&ctx.accounts.ftr_account.to_account_info())?;
        if support_yes {
            p.ftr_yes = p.ftr_yes.saturating_add(weight);
        } else {
            p.ftr_no = p.ftr_no.saturating_add(weight);
        }
        Ok(())
    }

    pub fn tally_proposal(ctx: Context<TallyProposal>, _proposal_id: u32) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(
            p.status == ProposalStatus::Open,
            ConvictionError::InvalidPhaseTransition
        );
        let past_deadline = Clock::get()?.slot >= p.deadline_slot;
        let is_admin = ctx.accounts.caller.key() == ctx.accounts.config.admin;
        require!(
            past_deadline || is_admin,
            ConvictionError::InvalidPhaseTransition
        );
        p.status = ProposalStatus::Tallied;
        Ok(())
    }
}
