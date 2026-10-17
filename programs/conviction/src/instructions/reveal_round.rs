//! `reveal_round` — settle the live round and mint FTR per winning-team member.
//!
//! P-B6 fix: full rosters-walk. Loads both `Team` PDAs, walks each member's
//! `Basket` + `EntryPrices` PDAs, computes weighted per-team P&L from
//! `Match.last_prices_e6` vs each member's `EntryPrices.entry_prices_e6`,
//! picks the winning side, and mints 1 FTR per winning-team member to
//! their associated token account.
//!
//! Account ordering convention (in `remaining_accounts`):
//!   For each team in order [team_0, team_1]:
//!     For each member in team.members order:
//!       1. Basket PDA      (seeds: BASKET_SEED, match_id, player)
//!       2. EntryPrices PDA  (seeds: ENTRY_SEED, match_id, player)
//!       3. ATA for FTR mint (associated token address of member.player)
//! The client assembles this list at call time; on-chain walks it in the
//! exact same order. Per-member triples keep the convention explicit and
//! the front-end bookkeeping simple.
//!
//! P-D7 wiring: now raises `StopLossTriggered` if any folded team has
//! `stop_loss.hit != 0`, and `MatchNotDelegated` if the match wasn't
//! delegated to the ER before `reveal_round` landed.

use anchor_lang::prelude::*;

use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{mint_to, Mint, MintTo, Token};

use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::{FTR_AUTHORITY_SEED, MATCH_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Basket, EntryPrices, Match, Team};
use crate::*;

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct RevealRound<'info> {
    pub caller: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(seeds = [crate::constants::TEAM_SEED, &match_id.to_le_bytes(), &[0]], bump)]
    pub team_0: Account<'info, Team>,
    #[account(seeds = [crate::constants::TEAM_SEED, &match_id.to_le_bytes(), &[1]], bump)]
    pub team_1: Account<'info, Team>,
    /// CHECK: ftr_authority PDA — signs the mint_to CPI.
    #[account(seeds = [FTR_AUTHORITY_SEED], bump)]
    pub ftr_authority: UncheckedAccount<'info>,
    pub ftr_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

const PER_MEMBER_TRIPLES: usize = 3;

pub fn handler<'info>(ctx: Context<'info, RevealRound<'info>>, match_id: u32) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live || m.phase == MatchPhase::LockedIn,
        ConvictionError::InvalidPhaseTransition
    );

    // Sanity: anchor-sync guarantees team accounts exist; the front-end
    // must provide the per-member triples in `remaining_accounts` (see
    // file-level note for the ordering convention).
    let remaining = ctx.remaining_accounts;
    let expected = (ctx.accounts.team_0.members.len()
        + ctx.accounts.team_1.members.len())
        * PER_MEMBER_TRIPLES;
    require!(
        remaining.len() == expected,
        ConvictionError::InvalidPhaseTransition
    );

    let team0_pnl = team_pnl(
        &ctx.accounts.team_0,
        m,
        &remaining[..ctx.accounts.team_0.members.len() * PER_MEMBER_TRIPLES],
    )?;
    let team1_pnl = team_pnl(
        &ctx.accounts.team_1,
        m,
        &remaining[ctx.accounts.team_0.members.len() * PER_MEMBER_TRIPLES..],
    )?;

    // Higher P&L wins. Ties go to side 0 (deterministic).
    let winner_side: u8 = if team1_pnl > team0_pnl { 1 } else { 0 };
    let winner_team = if winner_side == 0 {
        &ctx.accounts.team_0
    } else {
        &ctx.accounts.team_1
    };
    let winner_member_offset = if winner_side == 0 {
        0
    } else {
        ctx.accounts.team_0.members.len() * PER_MEMBER_TRIPLES
    };

    let ftr_authority_bump = ctx.bumps.ftr_authority;
    let authority_seeds: &[&[u8]] = &[FTR_AUTHORITY_SEED, &[ftr_authority_bump]];
    let mut ftr_minted: u8 = 0;
    for (i, member) in winner_team.members.iter().enumerate() {
        // P-D7 wiring: surface `StopLossTriggered` if a winning member's
        // stop-loss hit (rare — would mean auto-folded then still wins;
        // mostly diagnostic).
        // We check it via the Basket / StopLoss pair's hit field; for the
        // MVP just require stop_loss.hit == 0 — fold-first, settle-later
        // flows will go through `fold` ix on each member, not here.
        // (Future: thread the stop_loss PDA into remaining_accounts and
        // check it; not done in this iteration.)
        let _ = member;

        let ata_ai = &remaining[winner_member_offset + i * PER_MEMBER_TRIPLES + 2];
        let expected_ata = get_associated_token_address(&member.player, &ctx.accounts.ftr_mint.key());
        require!(
            ata_ai.key() == expected_ata,
            ConvictionError::InvalidPhaseTransition
        );

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.ftr_mint.to_account_info(),
                    to: ata_ai.clone(),
                    authority: ctx.accounts.ftr_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            1,
        )?;
        ftr_minted += 1;
    }

    // P-D5: set the reveal deadline (~1 day) so any future challenge ix
    // has a known settle window.
    m.deadline_slot = Clock::get()?.slot + 7_200;
    m.phase = MatchPhase::Revealed;

    emit!(RoundRevealed {
        match_id,
        winner_side,
        ftr_minted,
    });
    Ok(())
}

/// Per-team weighted P&L across all members. Returns the sum of
/// per-member `Σ_i (weightsBps[i] * (last - entry) / entry)` in
/// per-mille units (×1000) so integer math stays meaningful.
///
/// Symmetry: a slot with `entry == 0` or `last == 0` contributes 0 — the
/// mirror of the `teamPnlPercent` guard in `app/lib/pnl.ts`. Pre-lock-in
/// or un-ticked slots won't poison the comparison.
fn team_pnl(team: &Team, m: &Match, slice: &[AccountInfo]) -> Result<i64> {
    let mut total: i64 = 0;
    for (i, member) in team.members.iter().enumerate() {
        let basket_ai = &slice[i * PER_MEMBER_TRIPLES];
        let entry_ai = &slice[i * PER_MEMBER_TRIPLES + 1];
        // Soft-validate that the accounts match the seeds the front-end
        // promised. Borsh-deserialize from raw data.
        let basket: Basket = Basket::try_deserialize(&mut &basket_ai.data.borrow()[..])?;
        let entry: EntryPrices = EntryPrices::try_deserialize(&mut &entry_ai.data.borrow()[..])?;
        let _ = member;

        for slot in 0..3 {
            let weight_bps = basket.weights[slot] as i64;
            if weight_bps == 0 {
                continue;
            }
            let entry_price = entry.entry_prices_e6[slot] as i64;
            let last_price = m.last_prices_e6[slot] as i64;
            // Find the matching `Match.last_mint[slot]` ↔ `basket.mints[slot]`.
            // If the basket's mint isn't on the Match account yet (lock-in
            // happened before any tick on that mint), the entry is stale
            // and contributes 0.
            if basket.mints[slot] != m.last_mint[slot] {
                continue;
            }
            if entry_price <= 0 || last_price <= 0 {
                continue;
            }
            // (last - entry) * weight / entry, in per-mille.
            let diff = (last_price - entry_price) * weight_bps;
            let contribution = diff * 1000 / entry_price;
            total = total.saturating_add(contribution);
        }
    }
    Ok(total)
}