//! `callback_villain` — VRF fulfillment for the villain token selection.
//!
//! Phase A.2 MVP: writes the VRF randomness and a `villain_mint` derived
//! deterministically from the randomness. The placeholder assigns
//! `Pubkey::default()` because the curated token universe lives in the
//! front-end (Phase B wires `tokens.json`).
//!
//! Follow-up Blocker 1 (per ADR 0002 / 0002-addendum): persist a real mint
//! selected from `tokens.json` via `remaining_accounts` in a follow-up ix.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf_callback;

use crate::constants::VILLAIN_SEED;
use crate::errors::ConvictionError;
use crate::state::VillainPick;

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
    pub match_account: UncheckedAccount<'info>,
}

pub fn handler(
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
