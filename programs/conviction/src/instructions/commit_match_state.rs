//! `commit_match_state` — explicit commit (no phase change, no undelegation).

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::state::Match;

#[commit]
#[derive(Accounts)]
pub struct CommitMatchState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, Match>,
}

pub fn handler(ctx: Context<CommitMatchState>) -> Result<()> {
    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit(&[ctx.accounts.match_account.to_account_info()])
    .build_and_invoke()?;
    Ok(())
}
