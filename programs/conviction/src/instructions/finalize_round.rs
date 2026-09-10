//! `finalize_round` — set phase to `Finalized` and commit/undelegate the
//! match state back to base.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegateMatchState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, Match>,
}

pub fn handler(ctx: Context<CommitAndUndelegateMatchState>, _match_id: u32) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Revealed,
        ConvictionError::InvalidPhaseTransition
    );
    m.phase = MatchPhase::Finalized;
    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit_and_undelegate(&[ctx.accounts.match_account.to_account_info()])
    .build_and_invoke()?;
    Ok(())
}
