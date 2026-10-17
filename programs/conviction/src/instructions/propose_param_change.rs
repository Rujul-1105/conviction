//! `propose_param_change` — open a governance proposal with a 1-day
//! (216,000 slots) voting window.
//!
//! P-D1 fix: gated to `config.admin` (the operator that called `init_config`).
//! Previously any signer could open a proposal; the live demo bootstrap
//! already runs under `~/.config/solana/id.json` which is the admin, so
//! this is a security tightening with no operator workflow change. The
//! `has_one = admin @ NotAuthority` constraint fires for non-admin
//! signers without burning a compute unit on a hand-rolled `require!`.

use anchor_lang::prelude::*;

use crate::constants::{GAME_CONFIG_SEED, PROPOSAL_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::ProposalStatus, GameConfig, Proposal};
use crate::*;

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct ProposeParamChange<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [GAME_CONFIG_SEED], bump, has_one = admin @ ConvictionError::NotAuthority)]
    pub config: Account<'info, GameConfig>,
    #[account(init, payer = admin, space = Proposal::SIZE, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
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
    p.proposer = ctx.accounts.admin.key();
    p.param_name = param_name;
    p.new_value = new_value;
    p.ftr_yes = 0;
    p.ftr_no = 0;
    p.deadline_slot = Clock::get()?.slot + 216_000;
    p.status = ProposalStatus::Open;
    p.bump = ctx.bumps.proposal;
    // P-B4 fix: emit on-chain event for indexers.
    emit!(ProposalOpened {
        proposal_id,
        proposer: p.proposer,
        param_name,
    });
    Ok(())
}
