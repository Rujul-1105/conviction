//! `lock_in_pre_round` — submit the player's basket + stop-loss + PER roster.
//!
//! Per-player seeds both the `Basket` and `StopLoss` PDAs and seeds the PER
//! permission PDA. Pre-funds rent for the upcoming permission-account init.

use anchor_lang::prelude::*;

use crate::constants::{BASKET_SEED, MATCH_SEED, STOP_LOSS_SEED};
use crate::errors::ConvictionError;
use crate::helpers::{pre_fund_permission_rent, require_members_within_cap};
use crate::state::{enums::MatchPhase, Basket, Match, StopLoss, StopLossRange};

#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct LockInPreRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init, payer = player, space = Basket::SIZE, seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub basket: Account<'info, Basket>,
    #[account(init, payer = player, space = StopLoss::SIZE, seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<LockInPreRound>,
    _match_id: u32,
    side: u8,
    mints: [Pubkey; 3],
    weights: [u16; 3],
    range: StopLossRange,
    per_member_pubkeys: [Pubkey; 8],
    per_member_flags: [u8; 8],
    per_member_count: u8,
) -> Result<()> {
    require_members_within_cap(per_member_count as usize)?;
    require!(side < 2, ConvictionError::InvalidPhaseTransition);
    require!(
        ctx.accounts.match_account.phase == MatchPhase::Created,
        ConvictionError::InvalidPhaseTransition
    );

    let basket = &mut ctx.accounts.basket;
    basket.match_id = _match_id;
    basket.side = side;
    basket.player = ctx.accounts.player.key();
    basket.mints = mints;
    basket.weights = weights;
    basket.per_members = per_member_pubkeys;
    basket.per_flags = per_member_flags;
    basket.bump = ctx.bumps.basket;

    let stop_loss = &mut ctx.accounts.stop_loss;
    stop_loss.match_id = _match_id;
    stop_loss.side = side;
    stop_loss.player = ctx.accounts.player.key();
    stop_loss.basket_pda = ctx.accounts.basket.key();
    stop_loss.range = range;
    stop_loss.hit = 0;
    stop_loss.per_members = per_member_pubkeys;
    stop_loss.per_flags = per_member_flags;
    stop_loss.bump = ctx.bumps.stop_loss;

    pre_fund_permission_rent(
        &ctx.accounts.player,
        &ctx.accounts.stop_loss.to_account_info(),
        &ctx.accounts.system_program,
    )?;
    pre_fund_permission_rent(
        &ctx.accounts.player,
        &ctx.accounts.basket.to_account_info(),
        &ctx.accounts.system_program,
    )?;
    Ok(())
}
