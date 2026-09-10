//! `callback_villain` — VRF fulfillment for the villain token selection.
//!
//! Derives a deterministic mint index from the VRF randomness using
//! `random_u8_with_range(0, 25)` and looks up `TOKEN_UNIVERSE[idx]` from
//! `constants.rs`. The minted token mirrors the front-end's
//! `app/tokens.json` curated universe so it's always a real, tradeable
//! SPL mint.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf_callback;

use crate::constants::{TOKEN_UNIVERSE, VILLAIN_SEED};
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

    // Pick a real mint from the curated 25-token universe.
    let universe_len = TOKEN_UNIVERSE.len() as u8;
    let pick_idx = ephemeral_rollups_sdk::vrf::rnd::random_u8_with_range(
        &randomness,
        0,
        universe_len,
    );
    vp.villain_mint = TOKEN_UNIVERSE[pick_idx as usize];
    Ok(())
}