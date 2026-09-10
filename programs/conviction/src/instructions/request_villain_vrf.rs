//! `request_villain_vrf` — kick off the VRF flow that selects the round's
//! villain token.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf;
use ephemeral_rollups_sdk::vrf::instructions::{create_request_scoped_randomness_ix, RequestRandomnessParams};
use ephemeral_rollups_sdk::vrf::types::SerializableAccountMeta;

use crate::constants::{MATCH_SEED, VILLAIN_SEED};
use crate::errors::ConvictionError;
use crate::helpers::require_default_queue;
use crate::state::{Match, VillainPick};

#[vrf]
#[derive(Accounts)]
#[instruction(match_id: u32)]
pub struct RequestVillainVrf<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = VillainPick::SIZE,
        seeds = [VILLAIN_SEED, match_account.key().as_ref()],
        bump,
    )]
    pub villain_pick: Account<'info, VillainPick>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: VRF queue (validated in handler).
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequestVillainVrf>, _match_id: u32) -> Result<()> {
    require_default_queue(ctx.accounts.oracle_queue.key())?;

    // Idempotency: reject if a randomness has already landed.
    let vp = &ctx.accounts.villain_pick;
    require!(
        vp.randomness == [0u8; 32],
        ConvictionError::VillainAlreadyFulfilled
    );

    let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.payer.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: crate::id(),
        callback_discriminator: crate::instruction::CallbackVillain::DISCRIMINATOR
            .to_vec(),
        caller_seed: [0u8; 32],
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.match_account.key(),
            is_signer: false,
            is_writable: true,
        }]),
        callback_args: None,
        ..Default::default()
    });
    ctx.accounts.invoke_signed_vrf(
        &ctx.accounts.payer.to_account_info(),
        &ix,
    )?;
    Ok(())
}
