//! Team + TeamMember — roster structures, one Team per match per side.
//!
//! `folded: bool` flips to true when any team member voluntarily folds
//! during the Live phase (via the `fold` ix) or when an auto-fold fires
//! from the stop-loss (settled in `reveal_round`). The whole team folds
//! as a unit — there is no per-member tracking because the game rules
//! treat the basket as a single co-operative position.

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
    pub folded: bool,
}
impl Team {
    // Discriminator + fields. `members` is hardcoded for 4 × TeamMember (96 bytes each)
    // to match the existing cap. Bump TeamMember count by editing both this constant
    // and the `Vec<TeamMember>` sizing everywhere.
    pub const SIZE: usize = 8 + 4 + 1 + 32 + (4 + 4 * 96) + 8 + 1 + 1 + 1;
}