//! `vote_on_proposal` — submit a vote weighted by voter's current FTR
//! token-account balance (snapshotted at vote time).

use anchor_lang::prelude::*;

use anchor_spl::token::{accessor, TokenAccount};

use crate::constants::{GAME_CONFIG_SEED, PROPOSAL_SEED};
use crate::errors::ConvictionError;
use crate::state::{enums::ProposalStatus, GameConfig, Proposal};

#[derive(Accounts)]
#[instruction(proposal_id: u32)]
pub struct VoteOnProposal<'info> {
    pub voter: Signer<'info>,
    /// CHECK: voter's FTR token account. Used to read the snapshot weight.
    #[account(constraint = ftr_account.mint == config.ftr_mint @ ConvictionError::FtrMintNotInitialized)]
    pub ftr_account: Account<'info, TokenAccount>,
    #[account(seeds = [GAME_CONFIG_SEED], bump)]
    pub config: Account<'info, GameConfig>,
    #[account(mut, seeds = [PROPOSAL_SEED, &proposal_id.to_le_bytes()], bump)]
    pub proposal: Account<'info, Proposal>,
}

pub fn handler(ctx: Context<VoteOnProposal>, _proposal_id: u32, support_yes: bool) -> Result<()> {
    let p = &mut ctx.accounts.proposal;
    require!(
        p.status == ProposalStatus::Open,
        ConvictionError::InvalidPhaseTransition
    );
    require!(
        Clock::get()?.slot < p.deadline_slot,
        ConvictionError::InvalidPhaseTransition
    );
    let weight = accessor::amount(&ctx.accounts.ftr_account.to_account_info())?;
    if support_yes {
        p.ftr_yes = p.ftr_yes.saturating_add(weight);
    } else {
        p.ftr_no = p.ftr_no.saturating_add(weight);
    }
    Ok(())
}
