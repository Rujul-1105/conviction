//! `delegate_stop_loss` — delegate the player's `StopLoss` PDA to the ER.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::constants::STOP_LOSS_SEED;

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateStopLoss<'info> {
    pub player: Signer<'info>,
    /// CHECK: StopLoss PDA, delegated here.
    #[account(mut, del, seeds = [STOP_LOSS_SEED, &match_id.to_le_bytes(), player.key().as_ref()], bump)]
    pub stop_loss: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DelegateStopLoss>, match_id: u32, _side: u8) -> Result<()> {
    ctx.accounts.delegate_stop_loss(
        &ctx.accounts.player,
        &[STOP_LOSS_SEED, &match_id.to_le_bytes(), ctx.accounts.player.key.as_ref()],
        DelegateConfig::default(),
    )?;
    Ok(())
}
