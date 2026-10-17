//! `callback_villain` — VRF fulfillment for the villain token selection.
//!
//! Derives a deterministic mint index from the VRF randomness using
//! `random_u8_with_range(0, 25)` and looks up `TOKEN_UNIVERSE[idx]` from
//! `constants.rs`. The minted token mirrors the front-end's
//! `app/tokens.json` curated universe so it's always a real, tradeable
//! SPL mint.
//!
//! P-B2 fix: also mirror the chosen mint into `Match.villain_pubkey` so
//! the on-chain Match account carries the villain identity (previously
//! this field was `None` for the entire match lifecycle — declared in
//! `Match` but never written). We deserialize+serialize through raw
//! account data because the Accounts struct declares `match_account` as
//! `UncheckedAccount` (the VRF callback can't depend on Anchor account
//! resolution since it runs on the ER without the full provider stack).

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf_callback;

use crate::constants::{TOKEN_UNIVERSE, VILLAIN_SEED};
use crate::errors::ConvictionError;
use crate::state::{Match, VillainPick};
use crate::*;

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
    let picked_mint = TOKEN_UNIVERSE[pick_idx as usize];
    vp.villain_mint = picked_mint;

    // Mirror to Match.villain_pubkey via raw deserialize/serialize —
    // the Accounts struct can't promote `match_account` to
    // `Account<'info, Match>` here without breaking the `#[vrf_callback]`
    // macro's account-metas plumbing.
    let mut data = ctx.accounts.match_account.try_borrow_mut_data()?;
    let mut m = Match::try_deserialize(&mut &data[..])?;
    m.villain_pubkey = Some(picked_mint);
    m.serialize(&mut &mut data[..])?;

    emit!(VillainSelected {
        match_id: _match_id,
        mint: picked_mint,
    });
    Ok(())
}