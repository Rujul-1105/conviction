//! Basket — one per player per match.
//! PDA: `[BASKET_SEED, match_id, player]`.

use anchor_lang::prelude::*;

use crate::constants::MAX_PERMISSION_MEMBERS;

#[account]
pub struct Basket {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    pub mints: [Pubkey; 3],
    pub weights: [u16; 3],
    pub per_members: [Pubkey; MAX_PERMISSION_MEMBERS],
    pub per_flags: [u8; MAX_PERMISSION_MEMBERS],
    pub bump: u8,
}
impl Basket {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + 96 + 6 + 256 + 8 + 1;
}
