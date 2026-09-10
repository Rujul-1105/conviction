//! `delegate_team` — delegate the per-side `Team` PDA to the ER.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::constants::TEAM_SEED;

#[delegate]
#[derive(Accounts)]
#[instruction(match_id: u32, side: u8)]
pub struct DelegateTeam<'info> {
    pub leader: Signer<'info>,
    /// CHECK: Team PDA, delegated here.
    #[account(mut, del, seeds = [TEAM_SEED, &match_id.to_le_bytes(), &[side]], bump)]
    pub team: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<DelegateTeam>, match_id: u32, side: u8) -> Result<()> {
    ctx.accounts.delegate_team(
        &ctx.accounts.leader,
        &[TEAM_SEED, &match_id.to_le_bytes(), &[side]],
        DelegateConfig::default(),
    )?;
    Ok(())
}
