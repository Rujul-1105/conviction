//! `reveal_round` — settle the live round, minting 1 FTR to the winning
//! team's FTR token account.
//!
//! Follow-up Blocker 7 (ADR 0002 addendum): walk both team rosters and
//! mint FTR per-member rather than hardcoding a 1-FTR payout to one
//! recipient.

use anchor_lang::prelude::*;

use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::{FTR_AUTHORITY_SEED, MATCH_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct RevealRound<'info> {
    pub caller: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: ftr_authority PDA — signs the mint_to CPI.
    #[account(seeds = [FTR_AUTHORITY_SEED], bump)]
    pub ftr_authority: UncheckedAccount<'info>,
    pub ftr_mint: Account<'info, Mint>,
    /// CHECK: winning team's FTR token account (recipient of mint_to).
    #[account(mut)]
    pub winner_ftr_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(_ctx: Context<RevealRound>, _match_id: u32) -> Result<()> {
    let m = &mut _ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live || m.phase == MatchPhase::LockedIn,
        ConvictionError::InvalidPhaseTransition
    );

    // Mint a 1-FTR payout to the winner's token account. Real basket
    // resolution + per-member minting lands in Phase B; MVP is a
    // single-account mint so the CPI path is provable end-to-end.
    let ftr_authority_bump = _ctx.bumps.ftr_authority;
    let authority_seeds: &[&[u8]] = &[FTR_AUTHORITY_SEED, &[ftr_authority_bump]];
    let payout: u64 = 1;
    mint_to(
        CpiContext::new_with_signer(
            _ctx.accounts.token_program.key(),
            MintTo {
                mint: _ctx.accounts.ftr_mint.to_account_info(),
                to: _ctx.accounts.winner_ftr_account.to_account_info(),
                authority: _ctx.accounts.ftr_authority.to_account_info(),
            },
            &[authority_seeds],
        ),
        payout,
    )?;

    m.phase = MatchPhase::Revealed;
    Ok(())
}
