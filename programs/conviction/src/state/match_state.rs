//! Match — per-round state record. PDA: `[MATCH_SEED, match_id.to_le()]`.
//!
//! `last_prices_e6` is a fixed-size parallel array of recent prices per
//! basket slot. The price crank (`tick_price` ix) writes into the slot
//! keyed off the mint index in `mints` — index 0/1/2 = first/second/third
//! basket mint. Slot 3 stays zero unless the basket spans more than 3
//! tokens, which the MVP cap disallows.

use anchor_lang::prelude::*;

use crate::state::enums::MatchPhase;

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
    /// Latest observed price (e6) per basket slot. See file-level note.
    pub last_prices_e6: [u64; 3],
}
impl Match {
    pub const SIZE: usize = 8 + 4 + 32 + 64 + 8 + 4 + 8 + 33 + 1 + 1 + (8 * 3);
}