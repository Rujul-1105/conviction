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

/// Why a team folded — distinguishes voluntary quit from stop-loss trigger
/// in the `TeamFolded` event so indexers / spectators can colour the feed
/// differently.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum FoldKind {
    /// Player chose to fold voluntarily (`fold` ix).
    Manual,
    /// StopLoss band hit; `reveal_round` auto-folds during settlement.
    StopLoss,
}
