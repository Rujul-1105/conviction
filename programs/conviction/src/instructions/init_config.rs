//! `init_config` — initialize the singleton `GameConfig`.
//!
//! Admin-only (the `admin` signer becomes the recorded authority). Sets the
//! SOL-denominated pot, round duration, and chaos event cap. `ftr_mint` is
//! left as `Pubkey::default()` and populated by a follow-up `init_ftr_mint`.

use anchor_lang::prelude::*;

use crate::constants::GAME_CONFIG_SEED;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = admin, space = GameConfig::SIZE, seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    /// CHECK: PDA that signs FTR mints; recorded in config. Created via
    /// `init_ftr_mint` (separate instruction) using this key.
    pub ftr_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitConfig>,
    base_pot: u64,
    round_duration_secs: u32,
    chaos_event_max: u8,
) -> Result<()> {
    let cfg = &mut ctx.accounts.config;
    cfg.admin = ctx.accounts.admin.key();
    cfg.ftr_authority = ctx.accounts.ftr_authority.key();
    cfg.ftr_mint = Pubkey::default(); // set by init_ftr_mint
    cfg.base_pot = base_pot;
    cfg.round_duration_secs = round_duration_secs;
    cfg.chaos_event_max = chaos_event_max;
    cfg.bump = ctx.bumps.config;
    Ok(())
}
