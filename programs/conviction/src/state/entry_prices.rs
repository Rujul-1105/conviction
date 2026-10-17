//! EntryPrices — per-player per-match lock-in snapshot (D11, P-B6 fix).
//!
//! The on-chain `Basket` PDA doesn't carry entry prices — `lock_in_pre_round`
//! only writes `mints` + `weights` + `range`. Without entry prices the
//! `reveal_round` handler cannot compute weighted P&L on-chain and the
//! MVP client had to fall back to a synthetic-Pubkey convention. We solve
//! that here with a parallel PDA keyed by `[ENTRY_SEED, match_id, side,
//! player]`. `lock_in_pre_round` writes it on first init (a snapshot of the
//! current `Match.last_prices_e6`); `reveal_round` reads it back.
//!
//! Decoupling from Basket avoids the realloc risk of mutating the Basket
//! struct (would need +24 bytes per existing PDA). New PDA = new account
//! space = no migration burden.
//!
//! `SIZE` math:
//!   8 (discriminator) + 4 (match_id) + 1 (side) + 32 (player) + 8*3 (entry
//!   prices e6) + 1 (bump) = 70 bytes.

use anchor_lang::prelude::*;

#[account]
pub struct EntryPrices {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    /// Per-slot entry price in e6-scaled USD, parallel to `Basket.mints`
    /// (and to `Match.last_prices_e6` / `Match.last_mint`). A slot that
    /// wasn't picked at lock-in keeps `0` and contributes 0 to the team's
    /// weighted P&L (matches the `teamPnlPercent` symmetry guard in
    /// `app/lib/pnl.ts`).
    pub entry_prices_e6: [u64; 3],
    pub bump: u8,
}

impl EntryPrices {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + (8 * 3) + 1;
}