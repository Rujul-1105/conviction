//! `lock_in_pre_round` — submit the player's basket + stop-loss + PER roster.
//!
//! Per-player seeds both the `Basket` and `StopLoss` PDAs and seeds the PER
//! permission PDA. Pre-funds rent for the upcoming permission-account init
//! (only on the *first* lock-in — pre-fund is a SOL transfer, not idempotent).
//!
//! Re-locking (the same player calling again before `finalize_round`) updates
//! the mutable fields (`mints`, `weights`, `range`, `per_members`, `per_flags`)
//! without resetting the immutable `bump` / `player` / `match_id` / `side` and
//! without over-funding the permission rent. `stop_loss.hit` is preserved
//! across re-locks so a triggered fold isn't accidentally cleared.
//!
//! P-D4 fix: transitions `match.phase Created → LockedIn` on the first
//! lock-in (any side) so `tick_price` (which requires `Live`) can later
//! reach `Live` once the round actually starts. Idempotent: re-locks
//! while already `LockedIn` or `Live` are allowed (they just update the
//! player's basket/stop-loss fields and re-emit).
//!
//! Emits `LockedIn` so the front-end + spectators see lock-ins as they
//! happen without diffing account state.

use anchor_lang::prelude::*;

use crate::constants::{BASKET_SEED, ENTRY_SEED, MATCH_SEED, STOP_LOSS_SEED};
use crate::errors::ConvictionError;
use crate::helpers::{pre_fund_permission_rent, require_members_within_cap};
use crate::state::{enums::MatchPhase, Basket, EntryPrices, Match, StopLoss, StopLossRange};
use crate::*;

#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct LockInPreRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    #[account(init_if_needed, payer = player, space = Basket::SIZE, seeds = [BASKET_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub basket: Account<'info, Basket>,
    #[account(init_if_needed, payer = player, space = StopLoss::SIZE, seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub stop_loss: Account<'info, StopLoss>,
    /// D11: per-player entry-price snapshot. `init_if_needed` so re-locks
    /// don't reset the entry. The snapshot is taken from the current
    /// `match.last_prices_e6` (parallel array — slot N corresponds to
    /// basket slot N). On a fresh match where `last_prices_e6` is all zeros
    /// (no ticks yet), the entry snapshot is all zeros — `reveal_round`
    /// treats zero as "stale" and contributes 0 to weighted P&L.
    ///
    /// Seed mirrors Basket: `(match_id, player)` — `side` lives on the
    /// account data but isn't part of the seed because a player can only
    /// be on one side.
    #[account(init_if_needed, payer = player, space = EntryPrices::SIZE,
        seeds = [ENTRY_SEED, &match_id.to_le_bytes(), player.key().as_ref()],
        bump)]
    pub entry_prices: Account<'info, EntryPrices>,
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
    let m = &mut ctx.accounts.match_account;
    // Allow Created → LockedIn transition (first lock-in); also allow
    // re-locks while already LockedIn. Re-locks while Live would let a
    // late player sneak in post-tick; rejected.
    require!(
        m.phase == MatchPhase::Created || m.phase == MatchPhase::LockedIn,
        ConvictionError::InvalidPhaseTransition
    );

    // Detect first-time init for both PDAs via the `player` discriminator:
    // a freshly-created account has `player == Pubkey::default()`. Anchor's
    // `init_if_needed` would silently re-zero nothing on a re-entry, so we
    // use this as the gate to skip immutable-field writes, skip the bump
    // assignment, and skip the rent pre-fund on the second-and-later locks.
    let basket = &mut ctx.accounts.basket;
    let basket_first_init = basket.player == Pubkey::default();
    if basket_first_init {
        basket.match_id = _match_id;
        basket.side = side;
        basket.player = ctx.accounts.player.key();
        basket.bump = ctx.bumps.basket;
    }
    basket.mints = mints;
    basket.weights = weights;
    basket.per_members = per_member_pubkeys;
    basket.per_flags = per_member_flags;

    let stop_loss = &mut ctx.accounts.stop_loss;
    let stop_loss_first_init = stop_loss.player == Pubkey::default();
    if stop_loss_first_init {
        stop_loss.match_id = _match_id;
        stop_loss.side = side;
        stop_loss.player = ctx.accounts.player.key();
        stop_loss.bump = ctx.bumps.stop_loss;
    }
    stop_loss.basket_pda = ctx.accounts.basket.key();
    stop_loss.range = range;
    // `hit` is intentionally NOT reset on re-lock — preserves a triggered
    // fold across a re-lock-in. The default-init zero is fine for the
    // first call.
    stop_loss.per_members = per_member_pubkeys;
    stop_loss.per_flags = per_member_flags;

    // D11: snapshot entry prices on first init. After this point the
    // snapshot is immutable (re-locks skip the write).
    let entry_prices = &mut ctx.accounts.entry_prices;
    if entry_prices.player == Pubkey::default() {
        entry_prices.match_id = _match_id;
        entry_prices.side = side;
        entry_prices.player = ctx.accounts.player.key();
        entry_prices.entry_prices_e6 = m.last_prices_e6;
        entry_prices.bump = ctx.bumps.entry_prices;
    }

    // P-D4: transition Created → LockedIn on the first lock-in. Idempotent
    // — re-locks leave the phase alone.
    if m.phase == MatchPhase::Created {
        m.phase = MatchPhase::LockedIn;
    }

    // Pre-fund permission rent only on the first lock — these are SOL
    // transfers to the PDAs, not idempotent.
    if basket_first_init {
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
    }

    emit!(LockedIn {
        match_id: _match_id,
        side,
        player: ctx.accounts.player.key(),
        mints,
        weights,
    });
    Ok(())
}
