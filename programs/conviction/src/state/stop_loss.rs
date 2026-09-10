//! StopLoss + StopLossRange.
//! StopLoss PDA: `[STOP_LOSS_SEED, match_id, player]`.

use anchor_lang::prelude::*;

use crate::constants::MAX_PERMISSION_MEMBERS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct StopLossRange {
    pub min_bps: u16,
    pub max_bps: u16,
}

#[account]
pub struct StopLoss {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    pub basket_pda: Pubkey,
    pub range: StopLossRange,
    pub hit: u8,
    pub per_members: [Pubkey; MAX_PERMISSION_MEMBERS],
    pub per_flags: [u8; MAX_PERMISSION_MEMBERS],
    pub bump: u8,
}
impl StopLoss {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + 32 + 4 + 1 + 256 + 8 + 1;
}
