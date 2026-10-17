//! `tick_price` — ER-side price crank.
//!
//! Writes the latest observed price for one basket slot into
//! `Match.last_prices_e6[i]` AND records which mint it was for in
//! `Match.last_mint[i]`. P-B1 fix: the on-chain signature now takes an
//! explicit `mint_index: u8` AND a real `mint: Pubkey` (not a synthetic
//! first-byte-encoded Pubkey). The matching logic prefers an existing
//! slot (`Match.last_mint[i] == mint`) and falls back to the first empty
//! slot (`Match.last_mint[i] == Pubkey::default()`) so:
//!
//!   - Existing Match PDAs (last_mint = [default; 3]) self-heal: first
//!     tick on any mint fills slot 0.
//!   - Once a slot is filled, subsequent ticks on the same mint update
//!     the price in place.
//!   - Three distinct mints can claim the three slots; a fourth mint
//!     gets `InvalidPhaseTransition` (reusing the existing variant —
//!     the basket cap is 3 mints).
//!
//! Emits `PriceTick` so indexers / event subscribers see every crank
//! without having to diff account state.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::MATCH_SEED;
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};
use crate::*;

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct TickPrice<'info> {
    pub crank: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
}

pub fn handler(
    ctx: Context<TickPrice>,
    _match_id: u32,
    mint: Pubkey,
    price_e6: u64,
) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live,
        ConvictionError::MatchNotLive
    );

    // First, try to update an existing slot whose mint matches.
    let mut slot: Option<usize> = (0..3).find(|i| m.last_mint[*i] == mint);
    if slot.is_none() {
        // No existing match — claim the first empty slot.
        slot = (0..3).find(|i| m.last_mint[*i] == Pubkey::default());
    }
    let slot = slot.ok_or(ConvictionError::InvalidPhaseTransition)?;

    m.last_mint[slot] = mint;
    m.last_prices_e6[slot] = price_e6;

    emit!(PriceTick {
        match_id: _match_id,
        slot: slot as u8,
        price_e6,
    });
    Ok(())
}