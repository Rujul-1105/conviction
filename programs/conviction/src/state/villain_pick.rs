/// VillainPick — VRF-driven villain token selection for a match.
/// Pre-created by `request_villain_vrf`; `callback_villain` writes the
/// randomness on fulfillment.

use anchor_lang::prelude::*;

#[account]
pub struct VillainPick {
    pub match_id: u32,
    pub randomness: [u8; 32],
    pub villain_mint: Pubkey,
    pub fulfilled_at_slot: u64,
    pub bump: u8,
}
impl VillainPick {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 8 + 1;
}
