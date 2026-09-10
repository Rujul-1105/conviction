//! `tick_price` — ER-side price crank. Validates the match is live and
//! does nothing else.
//!
//! Follow-up Blocker 2 (ADR 0002 addendum): persist the price into a new
//! `PriceTick` account or extend `Match` so charts have on-chain history.
//! Until then this is a no-op stub whose IDL still carries the args.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::commit;

use crate::constants::MATCH_SEED;
use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};

#[commit]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct TickPrice<'info> {
    pub crank: Signer<'info>,
    #[account(mut, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
}

pub fn handler(
    _ctx: Context<TickPrice>,
    _match_id: u32,
    _mint: Pubkey,
    _price_e6: u64,
) -> Result<()> {
    let m = &_ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Live,
        ConvictionError::MatchNotLive
    );
    Ok(())
}
