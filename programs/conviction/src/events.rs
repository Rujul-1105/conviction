//! On-chain events emitted by every meaningful state transition (P-B4 fix).
//!
//! The program emits zero events today — the front-end has to scrape
//! account diffs on the ER FQDN to know anything happened. Adding a
//! structured `#[event]` per mutation lets the front-end (and any future
//! indexer) subscribe to a log stream keyed off the program ID, with
//! typed payloads they don't have to deserialize from raw `sol_log_data`
//! bytes. Costs ~5-8 bytes per emit (the discriminator + payload length
//! prefix); cheap relative to the on-chain benefit.
//!
//! Anchor's `#[event]` macro is enabled by the `event-cpi` feature on
//! `anchor-lang` (see `Cargo.toml:40`). The macro emits the discriminator
//! + borsh serialize/deserialize glue + `#[derive(...)]` boilerplate
//! automatically — do NOT add `AnchorSerialize` / `AnchorDeserialize`
//! derives manually (conflicting impls will fail at compile time).
//!
//! Field-naming convention: keep names short (`match_id`, not
//! `match_identifier`) — events appear in transaction logs and shorter
//! names reduce log size. Type names match the action they describe:
//! past-tense for one-shot events (`MatchCreated`), past-tense for
//! edge-triggered (`TeamFolded`, `ChaosFired`).

use anchor_lang::event;
use anchor_lang::prelude::*;

use crate::state::enums::FoldKind;

#[event]
pub struct MatchCreated {
    pub match_id: u32,
    pub authority: Pubkey,
    pub pot: u64,
}

#[event]
pub struct RoundFinalized {
    pub match_id: u32,
}

#[event]
pub struct TeamRegistered {
    pub match_id: u32,
    pub side: u8,
    pub leader: Pubkey,
}

#[event]
pub struct LockedIn {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
    pub mints: [Pubkey; 3],
    pub weights: [u16; 3],
}

#[event]
pub struct TeamFolded {
    pub match_id: u32,
    pub side: u8,
    pub by: Pubkey,
    pub kind: FoldKind,
}

#[event]
pub struct TeamMemberLeft {
    pub match_id: u32,
    pub side: u8,
    pub player: Pubkey,
}

#[event]
pub struct RoundRevealed {
    pub match_id: u32,
    pub winner_side: u8,
    pub ftr_minted: u8,
}

#[event]
pub struct VillainSelected {
    pub match_id: u32,
    pub mint: Pubkey,
}

#[event]
pub struct ChaosFired {
    pub match_id: u32,
    pub sequence: u32,
    pub kind: u8,
}

#[event]
pub struct ProposalOpened {
    pub proposal_id: u32,
    pub proposer: Pubkey,
    pub param_name: [u8; 32],
}

#[event]
pub struct ProposalTallied {
    pub proposal_id: u32,
    pub ftr_yes: u64,
    pub ftr_no: u64,
}

#[event]
pub struct PriceTick {
    pub match_id: u32,
    pub slot: u8,
    pub price_e6: u64,
}