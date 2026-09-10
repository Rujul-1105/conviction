//! Match — per-round state record. PDA: `[MATCH_SEED, match_id.to_le()]`.

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
}
impl Match {
    pub const SIZE: usize = 8 + 4 + 32 + 64 + 8 + 4 + 8 + 33 + 1 + 1;
}
