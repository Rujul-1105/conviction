//! RoundCounter — singleton round-number counter.

use anchor_lang::prelude::*;

#[account]
pub struct RoundCounter {
    pub current_round: u32,
    pub bump: u8,
}
impl RoundCounter {
    pub const SIZE: usize = 8 + 4 + 1;
}
