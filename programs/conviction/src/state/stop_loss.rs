//! StopLoss + StopLossRange.
//! StopLoss PDA: `[STOP_LOSS_SEED, match_id, player]`.

use anchor_lang::prelude::*;

use crate::constants::MAX_PERMISSION_MEMBERS;

/// Signed stop-loss band — `min_bps` is the floor (most-negative loss tolerable),
/// `max_bps` is the edge (least-negative loss tolerable).
///
/// The UI models these as negative values (e.g. `minBps: -1500` means "stop when
/// loss exceeds 15%"). Signed `i16` is required so Borsh accepts the negative
/// inputs at the serializer boundary (Borsh rejects negative values for `u16`).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct StopLossRange {
    pub min_bps: i16,
    pub max_bps: i16,
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
