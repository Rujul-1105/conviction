//! `register_team` — register a team on one of the two sides of a match.
//!
//! `side` must be 0 or 1; the team account's PDA embeds `side` so a second
//! attempt at the same side fails with `Init` constraint.

use anchor_lang::prelude::*;

use crate::constants::{MATCH_SEED, TEAM_SEED};
use crate::errors::ConvictionError;
use crate::state::{
    enums::MatchPhase,
    Match, Team, TeamMember,
};

#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct RegisterTeam<'info> {
    #[account(mut)]
    pub leader: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump, constraint = match_account.phase == MatchPhase::Created @ ConvictionError::InvalidPhaseTransition)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = leader, space = Team::SIZE, seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]], bump)]
    pub team: Account<'info, Team>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterTeam>,
    match_id: u32,
    side: u8,
    members: Vec<TeamMember>,
) -> Result<()> {
    require!(side < 2, ConvictionError::InvalidPhaseTransition);
    let team = &mut ctx.accounts.team;
    team.match_id = match_id;
    team.side = side;
    team.leader = ctx.accounts.leader.key();
    team.members = members;
    team.score = 0;
    team.alive = 1;
    team.bump = ctx.bumps.team;

    let m = &mut ctx.accounts.match_account;
    m.teams[side as usize] = ctx.accounts.team.key();
    require!(
        m.phase == MatchPhase::Created,
        ConvictionError::InvalidPhaseTransition
    );
    Ok(())
}
