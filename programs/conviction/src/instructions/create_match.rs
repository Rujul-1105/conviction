//! `create_match` — open a new match in the `Created` phase.
//!
//! Allocates both the per-match `Match` PDA and the singleton
//! `RoundCounter`. The counter is initialized here to 1; later the
//! `tick_price` / round-crank instructions may bump it.

use anchor_lang::prelude::*;

use crate::constants::{GAME_CONFIG_SEED, MATCH_SEED, ROUND_SEED};
use crate::state::{enums::MatchPhase, GameConfig, Match, RoundCounter};

#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = authority, space = Match::SIZE, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = authority, space = RoundCounter::SIZE, seeds = [ROUND_SEED], bump)]
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

    let rc = &mut ctx.accounts.round_counter;
    rc.current_round = 1;
    rc.bump = ctx.bumps.round_counter;
    Ok(())
}
