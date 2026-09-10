//! ConvictionError — single error enum for the conviction program.
//!
//! Lives at the crate root after the Phase A.2 split (see ADR 0002 addendum).
//! Each variant carries a `#[msg("…")]` annotation so on-chain error returns
//! decode into human-readable strings for clients (Anchor, IDL, TS client).
//!
//! `#[error_code]` is a Solana/Anchor attribute that wraps the enum in the
//! shape Anchor expects (a `pub struct ConvictionError(::anchor_lang::error::AnchorError);`
//! newtype); it does not change inter-module visibility, so this enum moves
//! freely between submodules with no SDK patch required.

use anchor_lang::prelude::*;

#[error_code]
pub enum ConvictionError {
    #[msg("Signer is not in the PER member set for this account")]
    NotPermitted,
    #[msg("Authority must match the recorded authority")]
    NotAuthority,
    #[msg("StopLoss is in triggered state")]
    StopLossTriggered,
    #[msg("Permission member count exceeds MAX_PERMISSION_MEMBERS")]
    TooManyMembers,
    #[msg("Match is not in the Live phase")]
    MatchNotLive,
    #[msg("Match phase transition is invalid")]
    InvalidPhaseTransition,
    #[msg("Villain VRF already fulfilled")]
    VillainAlreadyFulfilled,
    #[msg("Chaos VRF already fulfilled for this sequence")]
    ChaosAlreadyFulfilled,
    #[msg("Villain VRF request already pending")]
    VillainRequestPending,
    #[msg("Oracle queue is not a MagicBlock default queue")]
    InvalidOracleQueue,
    #[msg("FTR mint not yet initialized")]
    FtrMintNotInitialized,
    #[msg("No FTR token account provided for voter weight snapshot")]
    NoVoterFtrAccount,
    #[msg("Cannot reveal a match whose Match account is not delegated to ER")]
    MatchNotDelegated,
}
