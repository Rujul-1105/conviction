//! Team + TeamMember — roster structures, one Team per match per side.

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TeamMember {
    pub player: Pubkey,
    pub basket_pda: Pubkey,
    pub stop_loss_pda: Pubkey,
}

#[account]
pub struct Team {
    pub match_id: u32,
    pub side: u8,
    pub leader: Pubkey,
    pub members: Vec<TeamMember>,
    pub score: u64,
    pub alive: u8,
    pub bump: u8,
}
impl Team {
    pub const SIZE: usize = 8 + 4 + 1 + 32 + (4 + 4 * 96) + 8 + 1 + 1;
}
