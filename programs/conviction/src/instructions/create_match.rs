//! `create_match` — open a new match in the `Created` phase.
//!
//! Allocates the per-match `Match` PDA (one-shot `init`) and lazily
//! initializes / bumps the singleton `RoundCounter` PDA at
//! `[ROUND_SEED]` (`init_if_needed`). The counter starts at 1 on the
//! very first match ever and increments by 1 on every subsequent
//! match — `match_id` is normally sourced from this counter on the
//! client side, so each match gets a fresh sequential id.

use anchor_lang::prelude::*;

use crate::constants::{GAME_CONFIG_SEED, MATCH_SEED, ROUND_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, GameConfig, Match, RoundCounter};
use crate::*;

#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = authority, space = Match::SIZE, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init_if_needed, payer = authority, space = RoundCounter::SIZE, seeds = [ROUND_SEED], bump)]
    pub round_counter: Account<'info, RoundCounter>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateMatch>, match_id: u32, pot: u64) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    m.match_id = match_id;
    m.authority = ctx.accounts.authority.key();
    m.teams = [Pubkey::default(), Pubkey::default()];
    m.pot = pot;
    m.phase = MatchPhase::Created;
    m.deadline_slot = 0;
    m.villain_pubkey = None;
    m.chaos_count = 0;
    m.bump = ctx.bumps.match_account;

    // Singleton RoundCounter: init-from-zero on first match, otherwise
    // bump. `init_if_needed` means the account already exists for
    // every match after the first — the `init` variant would revert
    // every time with `already in use`.
    let rc = &mut ctx.accounts.round_counter;
    if rc.current_round == 0 {
        rc.current_round = 1;
        rc.bump = ctx.bumps.round_counter;
    } else {
        rc.current_round = rc
            .current_round
            .checked_add(1)
            .ok_or(ConvictionError::Overflow)?;
    }

    emit!(MatchCreated {
        match_id,
        authority: ctx.accounts.authority.key(),
        pot,
    });
    Ok(())
}
