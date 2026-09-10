//! `request_chaos_vrf` — kick off a VRF request for a single chaos event.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf;
use ephemeral_rollups_sdk::vrf::instructions::{create_request_scoped_randomness_ix, RequestRandomnessParams};
use ephemeral_rollups_sdk::vrf::types::SerializableAccountMeta;

use crate::constants::{CHAOS_SEED, MATCH_SEED};
use crate::helpers::require_default_queue;
use crate::state::{ChaosEvent, Match};

#[vrf]
#[derive(Accounts)]
#[instruction(match_id: u32, sequence: u32)]
pub struct RequestChaosVrf<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: chaos PDA created by the callback (ER-only).
    #[account(
        init_if_needed,
        payer = payer,
        space = ChaosEvent::SIZE,
        seeds = [
            CHAOS_SEED,
            match_account.key().as_ref(),
            &sequence.to_le_bytes(),
        ],
        bump,
    )]
    pub chaos_event: Account<'info, ChaosEvent>,
    #[account(seeds = [MATCH_SEED, &match_id.to_le_bytes()], bump)]
    pub match_account: Account<'info, Match>,
    /// CHECK: VRF queue.
    #[account(mut)]
    pub oracle_queue: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequestChaosVrf>, _match_id: u32, sequence: u32) -> Result<()> {
    require_default_queue(ctx.accounts.oracle_queue.key())?;
    let mut caller_seed = [0u8; 32];
    caller_seed[0..4].copy_from_slice(&sequence.to_le_bytes());
    let ix = create_request_scoped_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.payer.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: crate::id(),
        callback_discriminator: crate::instruction::CallbackChaos::DISCRIMINATOR
            .to_vec(),
        caller_seed,
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.match_account.key(),
            is_signer: false,
            is_writable: true,
        }]),
        callback_args: Some(sequence.to_le_bytes().to_vec()),
        ..Default::default()
    });
    ctx.accounts.invoke_signed_vrf(
        &ctx.accounts.payer.to_account_info(),
        &ix,
    )?;
    Ok(())
}
