//! `fold` — a team member voluntarily exits during the Live phase.
//!
//! The whole team folds as a unit: any member (or the leader) can call
//! this ix, the team's `folded` flag flips to true, and `alive` goes to 0
//! so `reveal_round` can settle pot distribution. Auto-folds from stop-loss
//! hits are settled inside `reveal_round` (not here).
//!
//! `#[commit]` because this mutates a delegated Team PDA during ER execution
//! — same pattern as `tick_price`. After the fold lands, the next
//! `commit_match_state` call settles the change to base.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::{MATCH_SEED, TEAM_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match, Team};

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct Fold<'info> {
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
    ctx: Context<Fold>,
    _match_id: u32,
    side: u8,
) -> Result<()> {
    let m = &ctx.accounts.match_account;
    require!(m.phase == MatchPhase::Live, ConvictionError::MatchNotLive);
    require!(side < 2, ConvictionError::InvalidPhaseTransition);

    // Authorization: caller is the team's leader OR appears in `members`.
    let player_key = ctx.accounts.player.key();
    let authorized = ctx.accounts.team.leader == player_key
        || ctx.accounts
            .team
            .members
            .iter()
            .any(|tm| tm.player == player_key);
    require!(authorized, ConvictionError::NotAuthority);

    let team = &mut ctx.accounts.team;
    team.folded = true;
    team.alive = 0;
    Ok(())
}