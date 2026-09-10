//! `callback_chaos` — VRF fulfillment for a chaos event.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf_callback;

use crate::constants::CHAOS_SEED;
use crate::errors::ConvictionError;
use crate::state::{enums::ChaosKind, ChaosEvent};

#[vrf_callback]
#[derive(Accounts)]
#[instruction(match_id: u32, sequence: u32)]
pub struct CallbackChaos<'info> {
    #[account(
        mut,
        seeds = [
            CHAOS_SEED,
            match_account.key().as_ref(),
            &sequence.to_le_bytes(),
        ],
        bump,
    )]
    pub chaos_event: Account<'info, ChaosEvent>,
    /// CHECK: matched by VRF callback scope.
    #[account(mut)]
    pub match_account: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<CallbackChaos>,
    _match_id: u32,
    _sequence: u32,
    randomness: [u8; 32],
) -> Result<()> {
    let ce = &mut ctx.accounts.chaos_event;
    require!(
        ce.randomness == [0u8; 32],
        ConvictionError::ChaosAlreadyFulfilled
    );
    ce.randomness = randomness;
    ce.fired_at_slot = Clock::get()?.slot;
    let kind_byte = randomness[0] % 3;
    ce.kind = match kind_byte {
        0 => ChaosKind::Rug,
        1 => ChaosKind::Pump,
        _ => ChaosKind::FakeNews,
    };
    Ok(())
}
