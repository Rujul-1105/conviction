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
//!
//! `TOKEN_UNIVERSE` mirrors `app/tokens.json` — the curated 25 SPL mints
//! the front-end lets players pick from. `callback_villain` reads from
//! this array so the VRF-selected villain is always a real, tradeable
//! mint instead of `Pubkey::default()`. If you add/remove a token in
//! `tokens.json`, mirror the change here and redeploy.

use anchor_lang::prelude::Pubkey;
pub use anchor_lang::pubkey;

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

pub const TOKEN_UNIVERSE: [Pubkey; 25] = [
    pubkey!("So11111111111111111111111111111111111111112"), // SOL
    pubkey!("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"), // JUP
    pubkey!("jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL"), // JTO
    pubkey!("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"), // RAY
    pubkey!("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"), // ORCA
    pubkey!("HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"), // PYTH
    pubkey!("KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS"), // KMNO
    pubkey!("DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7"), // DRIFT
    pubkey!("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"), // BONK
    pubkey!("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"), // WIF
    pubkey!("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"), // POPCAT
    pubkey!("MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5"), // MEW
    pubkey!("WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk"), // WEN
    pubkey!("2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump"), // PNUT
    pubkey!("CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump"), // GOAT
    pubkey!("GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump"), // ACT
    pubkey!("ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY"), // MOODENG
    pubkey!("5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC"), // PONKE
    pubkey!("ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82"), // BOME
    pubkey!("7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3"), // SLERF
    pubkey!("HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4"), // MYRO
    pubkey!("3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN"), // MOTHER
    pubkey!("63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9"), // GIGA
    pubkey!("A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump"), // FWOG
    pubkey!("Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump"), // CHILLGUY
];