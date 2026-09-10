//! `leave_match` — a team member withdraws before the round locks in.
//!
//! Callable only while the match is in the `Created` phase (before either
//! side has called `lock_in_pre_round`). Removes the player from
//! `Team.members`. If the player has any pre-funded PER rent attached, the
//! caller is responsible for closing those accounts separately — rent
//! refund is left as a post-MVP gap to keep this ix atomic and simple.
//!
//! If the leader leaves, the next member (or the first remaining one)
//! inherits the leader key — see `handler` body.

use anchor_lang::prelude::*;

use crate::constants::{MATCH_SEED, TEAM_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match, Team};

#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct LeaveMatch<'info> {
    pub player: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(
        mut,
        seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]],
        bump,
    )]
    pub team: Account<'info, Team>,
}

pub fn handler(
    ctx: Context<LeaveMatch>,
    _match_id: u32,
    side: u8,
) -> Result<()> {
    let m = &ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Created,
        ConvictionError::InvalidPhaseTransition
    );
    require!(side < 2, ConvictionError::InvalidPhaseTransition);

    let player_key = ctx.accounts.player.key();
    let team = &mut ctx.accounts.team;
    let original_len = team.members.len();
    team.members.retain(|tm| tm.player != player_key);
    require!(
        team.members.len() < original_len,
        ConvictionError::NotAuthority
    );

    // Hand over leadership if the leader was the one leaving.
    if team.leader == player_key {
        if let Some(next) = team.members.first() {
            team.leader = next.player;
        } else {
            // No members left — team is empty. Don't zero `leader` here;
            // the match creator can call `register_team` again on the same
            // side if they want to reseed it. Leaving the leader key
            // pointing at the departed wallet is harmless because the
            // account is no longer reachable from `Match.teams[side]` once
            // `register_team` re-runs.
        }
    }
    Ok(())
}