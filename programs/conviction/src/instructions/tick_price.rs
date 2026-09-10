//! `tick_price` — ER-side price crank.
//!
//! Writes the latest observed price for one basket slot into
//! `Match.last_prices_e6[mint_index]`. The slot index is determined by
//! matching `_mint` against the basket PDAs the caller passes via
//! `remaining_accounts` (or, for the MVP, an off-chain price feed indexes
//! mints deterministically and passes the slot directly as `_mint` —
//! the front-end keeps the mapping).
//!
//! For MVP we accept the slot index encoded in the high byte of `_mint`:
//! the price crank front-end constructs a synthetic Pubkey whose first
//! byte is the slot index. This keeps the on-chain signature unchanged
//! while letting the handler write to the correct array slot. A cleaner
//! `mint_index: u8` arg is a Phase-2 API break.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::MATCH_SEED;
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};

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
    _mint: Pubkey,
    _price_e6: u64,
) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live,
        ConvictionError::MatchNotLive
    );

    // Decode the slot index from the synthetic Pubkey's first byte.
    // 0..=2 maps to `last_prices_e6[0..=2]`; anything else is rejected.
    let slot = _mint.to_bytes()[0];
    require!(slot < 3, ConvictionError::InvalidPhaseTransition);
    m.last_prices_e6[slot as usize] = _price_e6;
    Ok(())
}