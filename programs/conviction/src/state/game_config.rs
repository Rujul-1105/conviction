//! GameConfig — singleton program-wide configuration account.
//!
//! PDA: `[GAME_CONFIG_SEED]` at `GAME_CONFIG_SEED = b"config"`. Created
//! exactly once by `init_config` (the `init` constraint enforces the
//! uniqueness).
//!
//! `ftr_mint` is `Pubkey::default()` until `init_ftr_mint` runs in a
//! subsequent transaction; tests and IDL clients must handle that.

use anchor_lang::prelude::*;

#[account]
pub struct GameConfig {
    pub admin: Pubkey,
    pub ftr_authority: Pubkey,
    pub ftr_mint: Pubkey,
    pub base_pot: u64,
    pub round_duration_secs: u32,
    pub chaos_event_max: u8,
    pub bump: u8,
}
impl GameConfig {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 4 + 1 + 1;
}
