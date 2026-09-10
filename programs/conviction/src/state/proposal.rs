//! Proposal — one per governance proposal. PDA: `[PROPOSAL_SEED, id]`.

use anchor_lang::prelude::*;

use crate::state::enums::ProposalStatus;

#[account]
pub struct Proposal {
    pub proposal_id: u32,
    pub proposer: Pubkey,
    pub param_name: [u8; 32],
    pub new_value: u32,
    pub ftr_yes: u64,
    pub ftr_no: u64,
    pub deadline_slot: u64,
    pub status: ProposalStatus,
    pub bump: u8,
}
impl Proposal {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 4 + 8 + 8 + 8 + 1 + 1;
}
