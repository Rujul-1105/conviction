//! `delegate_match` — delegate the `Match` PDA to the MagicBlock ER.
//!
//! `#[delegate]` macro on the Accounts struct synthesizes
//! `delegate_match_account(&signer, seeds, DelegateConfig)` on the struct,
//! which we call here.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::constants::MATCH_SEED;

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct DelegateMatch<'info> {
    pub authority: Signer<'info>,
    /// CHECK: Match PDA, delegated here.
    #[account(mut, del, seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DelegateMatch>, match_id: u32) -> Result<()> {
    ctx.accounts.delegate_match_account(
        &ctx.accounts.authority,
        &[MATCH_SEED, &match_id.to_le_bytes()],
        DelegateConfig::default(),
    )?;
    Ok(())
}
