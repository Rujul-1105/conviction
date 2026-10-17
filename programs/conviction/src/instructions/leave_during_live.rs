//! `leave_during_live` — single-player exit from a `Live` round.
//!
//! P-B3 fix: pre-existing `leave_match` only works on `Created`-phase
//! matches (pre-lock-in). The new `leave_during_live` covers the
//! "I want to leave this live match as one player" flow: removes the
//! player from `team.members` without forcing the whole team to fold.
//!
//! P-D2 fix (partial): optional `close = player` on Basket and StopLoss
//! PDAs refunds their pre-funded rent back to the player. The PER
//! permission PDA close is NOT yet wired (MagicBlock SDK doesn't ship
//! a CPI helper for it as of `ephemeral-rollups-sdk 0.16.2`); the
//! per-permission rent stays in the data PDA until the program
//! upgrades its layout in Phase 9.
//!
//! Emits `TeamMemberLeft` so spectators + indexers see the drop in
//! realtime.

use anchor_lang::prelude::*;

use crate::constants::{BASKET_SEED, MATCH_SEED, STOP_LOSS_SEED, TEAM_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Basket, Match, StopLoss, Team};
use crate::*;

#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct LeaveDuringLive<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(mut, seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]], bump)]
    pub team: Account<'info, Team>,
    /// Optional close: Basket PDA. When present, its lamports are
    /// refunded to `player` (P-D2 partial). When absent, the caller
    /// is leaving pre-lock-in (Basket PDA never existed).
    #[account(mut, close = player,
        seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()],
        bump)]
    pub basket: Account<'info, Basket>,
    /// Optional close: StopLoss PDA. Same pattern as Basket.
    #[account(mut, close = player,
        seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()],
        bump)]
    pub stop_loss: Account<'info, StopLoss>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<LeaveDuringLive>,
    match_id: u32,
    side: u8,
) -> Result<()> {
    let m = &ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live,
        ConvictionError::InvalidPhaseTransition
    );

    let team = &mut ctx.accounts.team;
    let player_key = ctx.accounts.player.key();
    let before = team.members.len();
    team.members.retain(|tm| tm.player != player_key);
    require!(
        team.members.len() < before,
        ConvictionError::InvalidPhaseTransition
    );

    // Leader handover: if the leaving player was the leader and there
    // are remaining members, promote the first surviving member. Matches
    // `leave_match.rs:53-64` semantics so the two ixs behave consistently.
    if team.leader == player_key && !team.members.is_empty() {
        team.leader = team.members[0].player;
    }

    emit!(TeamMemberLeft {
        match_id,
        side,
        player: player_key,
    });
    Ok(())
}