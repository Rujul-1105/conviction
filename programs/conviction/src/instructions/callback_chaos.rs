//! `callback_chaos` — VRF fulfillment for a chaos event.
//!
//! P-D8 fix: increment `Match.chaos_count` on every fulfilled callback so
//! downstream handlers (`reveal_round`, spectators, indexers) can read
//! the running total. Saturating addition guards against an attacker
//! requesting more than `u8::MAX` chaos events.
//!
//! Emits `ChaosFired` with the kind discriminant so the front-end can
//! colour the chaos banner without re-decoding the ChaosEvent account.

use anchor_lang::prelude::*;

use ephemeral_rollups_sdk::anchor::vrf_callback;

use crate::constants::CHAOS_SEED;
use crate::errors::ConvictionError;
use crate::state::{enums::ChaosKind, ChaosEvent, Match};
use crate::*;

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
    /// CHECK: matched by VRF callback scope. Mutated here to bump
    /// `Match.chaos_count` (P-D8 fix).
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
    let kind = match kind_byte {
        0 => ChaosKind::Rug,
        1 => ChaosKind::Pump,
        _ => ChaosKind::FakeNews,
    };
    ce.kind = kind;

    // Increment chaos_count on Match via raw deserialize/serialize.
    let mut data = ctx.accounts.match_account.try_borrow_mut_data()?;
    let mut m = Match::try_deserialize(&mut &data[..])?;
    m.chaos_count = m.chaos_count.saturating_add(1);
    m.serialize(&mut &mut data[..])?;

    emit!(ChaosFired {
        match_id: _match_id,
        sequence: _sequence,
        kind: kind_byte,
    });
    Ok(())
}