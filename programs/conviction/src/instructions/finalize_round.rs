//! `finalize_round` — set phase to `Finalized` and commit/undelegate the
//! match state back to base.
//!
//! P-D5 fix: set `match.deadline_slot` before flipping phase. The field
//! is no longer dead — `reveal_round` will also write to it (the
//! settle-deadline before finalization) and any future `challenge_round`
//! ix can read it. The 7,200-slot window (~1 day) gives spectators and
//! indexers a known-good window to dispute settlement before it lands.
//!
//! Emits `RoundFinalized` so the front-end + indexers see the round-end
//! without diffing account state.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder};

use crate::errors::ConvictionError;
use crate::state::{enums::MatchPhase, Match};
use crate::*;

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegateMatchState<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, Match>,
}

pub fn handler(ctx: Context<CommitAndUndelegateMatchState>, match_id: u32) -> Result<()> {
    let m = &mut ctx.accounts.match_account;
    require!(
        m.phase == MatchPhase::Revealed,
        ConvictionError::InvalidPhaseTransition
    );
    m.phase = MatchPhase::Finalized;
    // ~1 day finality window — gives the front-end time to show the
    // reveal animation + spectators time to place post-round bets before
    // the on-chain state locks in.
    m.deadline_slot = Clock::get()?.slot + 7_200;

    MagicIntentBundleBuilder::new(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit_and_undelegate(&[ctx.accounts.match_account.to_account_info()])
    .build_and_invoke()?;

    emit!(RoundFinalized { match_id });
    Ok(())
}
