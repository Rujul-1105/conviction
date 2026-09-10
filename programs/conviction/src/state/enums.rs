//! Non-account enums used across multiple state structs and handlers.
//!
//! All three enums live here so they're trivially `use crate::state::*;`-
//! reachable in any submodule. Phase A.2 carried them inline in lib.rs;
//! after the split they stay grouped because they're conceptually "shapes"
//! rather than independent state entities.

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MatchPhase {
    Created,
    LockedIn,
    Live,
    Revealed,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalStatus {
    Open,
    Tallied,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChaosKind {
    Rug,
    Pump,
    FakeNews,
}
