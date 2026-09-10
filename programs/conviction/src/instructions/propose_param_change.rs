//! `propose_param_change` — open a governance proposal with a 1-day
//! (216,000 slots) voting window.

use anchor_lang::prelude::*;

use crate::constants::{GAME_CONFIG_SEED, PROPOSAL_SEED};
use crate::state::{enums::ProposalStatus, GameConfig, Proposal};

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct ProposeParamChange<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = proposer, space = Proposal::SIZE, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ProposeParamChange>,
    proposal_id: u32,
    param_name: [u8; 32],
    new_value: u32,
) -> Result<()> {
    let p = &mut ctx.accounts.proposal;
    p.proposal_id = proposal_id;
    p.proposer = ctx.accounts.proposer.key();
    p.param_name = param_name;
    p.new_value = new_value;
    p.ftr_yes = 0;
    p.ftr_no = 0;
    p.deadline_slot = Clock::get()?.slot + 216_000;
    p.status = ProposalStatus::Open;
    p.bump = ctx.bumps.proposal;
    Ok(())
}
