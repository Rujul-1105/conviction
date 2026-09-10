//! Free helper functions used across multiple instructions.
//!
//! Originally in `lib.rs` lines 283–341 (Phase A.2). Moved verbatim into
//! this module so the program core stays readable. Each helper is a single
//! concern: PER PDA derivation, rent pre-funding, member-count validation,
//! member-set enforcement, Magic program resolution, and VRF queue filtering.

use crate::constants::MAX_PERMISSION_MEMBERS;
use crate::errors::ConvictionError;
// use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use ephemeral_rollups_sdk::access_control::structs::{EphemeralPermission, PERMISSION_SEED};
use ephemeral_rollups_sdk::consts::{MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID};
use ephemeral_rollups_sdk::vrf::{self as vrf_sdk};

/// Derive the PER permission PDA for a given data PDA.
///
/// Permission PDAs are program-owned by the MagicBlock PERMISSION_PROGRAM_ID
/// and indexed by the data PDA's pubkey inside PERMISSION_SEED.
pub fn permission_pda(data_pda: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[PERMISSION_SEED, data_pda.as_ref()],
        &PERMISSION_PROGRAM_ID,
    )
    .0
}

/// Pre-pay the rent the PER permission account will need when finalized.
///
/// CPs SOL from `payer` to `data_pda` (which is owned by MagicBlock while in
/// delegation) so the upcoming permission-account initialization has
/// rent-exempt funds.
pub fn pre_fund_permission_rent<'info>(
    payer: &Signer<'info>,
    data_pda: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
) -> Result<()> {
    let rent = ephemeral_rollups_sdk::ephemeral_accounts::rent(EphemeralPermission::size_of(
        MAX_PERMISSION_MEMBERS,
    ) as u32);
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

/// Enforces that a `per_member` array doesn't exceed the on-chain cap.
/// Returns TooManyMembers error otherwise.
pub fn require_members_within_cap(member_count: usize) -> Result<()> {
    require!(
        member_count <= MAX_PERMISSION_MEMBERS,
        ConvictionError::TooManyMembers
    );
    Ok(())
}

/// Closes Phase 0 debt #1: enforces the permission list even on devnet's
/// non-TEE ER. Reads `per_members` from the data-PDA struct and refuses any
/// signer not on the list.
pub fn require_member_of(signer: Pubkey, members: &[Pubkey]) -> Result<()> {
    let found = members.iter().any(|m| *m == signer);
    require!(found, ConvictionError::NotPermitted);
    Ok(())
}

/// Resolve the Magic Program ID at runtime so SDK upgrades don't require
/// a constant edit. Prefer this over hard-coding the constant in handlers.
pub fn magic_program_id() -> Pubkey {
    MAGIC_PROGRAM_ID
}

/// Filter the default VRF queues. The MagicBlock default queue is
/// `DEFAULT_EPHEMERAL_QUEUE` on devnet/mainnet.
pub fn require_default_queue(oracle_queue: Pubkey) -> Result<()> {
    let ok = oracle_queue == vrf_sdk::consts::DEFAULT_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_TEST_QUEUE
        || oracle_queue == vrf_sdk::consts::DEFAULT_EPHEMERAL_TEST_QUEUE;
    require!(ok, ConvictionError::InvalidOracleQueue);
    Ok(())
}
