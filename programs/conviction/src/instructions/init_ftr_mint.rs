//! `init_ftr_mint` — create the FTR SPL mint, record its key on config.
//!
//! One-shot per program. `ftr_authority` PDA signs the mint authority so
//! later `mint_to` in `reveal_round` can use the CPI signer path.

use anchor_lang::prelude::*;

use anchor_spl::token::{Mint, Token};

use crate::constants::{FTR_AUTHORITY_SEED, GAME_CONFIG_SEED};
use crate::errors::ConvictionError;
use crate::state::GameConfig;

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitFtrMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: GameConfig; only admin can mutate.
    #[account(seeds = [GAME_CONFIG_SEED], bump, has_one = admin @ ConvictionError::NotAuthority)]
    pub config: Account<'info, GameConfig>,
    /// CHECK: ftr_authority PDA; signs the SPL mint init.
    #[account(seeds = [FTR_AUTHORITY_SEED], bump)]
    pub ftr_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = ftr_authority,
    )]
    pub ftr_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(_ctx: Context<InitFtrMint>, _decimals: u8) -> Result<()> {
    let cfg = &mut _ctx.accounts.config;
    cfg.ftr_mint = _ctx.accounts.ftr_mint.key();
    Ok(())
}
