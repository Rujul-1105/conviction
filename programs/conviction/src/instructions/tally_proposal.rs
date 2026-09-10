//! `tally_proposal` — close voting once the deadline has passed (or admin
//! forces the count). Status becomes `Tallied`; `passed`/`failed` is derived
//! client-side by comparing `ftr_yes` and `ftr_no`.

use anchor_lang::prelude::*;

use crate::constants::{GAME_CONFIG_SEED, PROPOSAL_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::ProposalStatus, GameConfig, Proposal};

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct TallyProposal<'info> {
    pub caller: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(mut, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
}

pub fn handler(ctx: Context<TallyProposal>, _proposal_id: u32) -> Result<()> {
    let p = &mut ctx.accounts.proposal;
    require!(
        p.status == ProposalStatus::Open,
        ConvictionError::InvalidPhaseTransition
    );
    let past_deadline = Clock::get()?.slot >= p.deadline_slot;
    let is_admin = ctx.accounts.caller.key() == ctx.accounts.config.admin;
    require!(
        past_deadline || is_admin,
        ConvictionError::InvalidPhaseTransition
    );
    p.status = ProposalStatus::Tallied;
    Ok(())
}
