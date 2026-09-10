//! PDA seed constants and PER member cap.
//!
//! All Anchor `#[account(seeds = […])]` derivations and PDA computations in
//! the program resolve through these constants. They're centralized here so
//! a renamed seed updates every Accounts struct at once.
//!
//! Seed shapes (see ADR 0002 addendum for the per-ix derivation table):
//!   GAME_CONFIG_SEED       — singleton config PDA
//!   MATCH_SEED + id        — per-match PDA
//!   TEAM_SEED + id + side  — two teams per match (side 0 / 1)
//!   BASKET_SEED            — one basket per player per match
//!   STOP_LOSS_SEED         — companion to basket
//!   VILLAIN_SEED           — VRF villain selection per match
//!   CHAOS_SEED + sequence  — chaos events created on the ER
//!   PROPOSAL_SEED          — one proposal PDA per id
//!   ROUND_SEED             — singleton round counter
//!   FTR_AUTHORITY_SEED     — singleton FTR mint authority PDA

// use crate::state::*;

/// Cap on how many PER members can be recorded in a Basket / StopLoss.
/// Enforced by `helpers::require_members_within_cap`.
pub const MAX_PERMISSION_MEMBERS: usize = 8;

pub const GAME_CONFIG_SEED: &[u8] = b"config";
pub const MATCH_SEED: &[u8] = b"match";
pub const TEAM_SEED: &[u8] = b"team";
pub const BASKET_SEED: &[u8] = b"basket";
pub const STOP_LOSS_SEED: &[u8] = b"stop-loss";
pub const VILLAIN_SEED: &[u8] = b"villain";
pub const CHAOS_SEED: &[u8] = b"chaos";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const ROUND_SEED: &[u8] = b"round";
pub const FTR_AUTHORITY_SEED: &[u8] = b"ftr_authority";
