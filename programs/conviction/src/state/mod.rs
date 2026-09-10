//! On-chain state for the conviction program.
//!
//! Each file in this module owns one (or a closely-related pair of) account
//! struct(s) + SIZE constants + any nested types they need. Splitting by
//! struct keeps the file-line cap comfortably under 30 LOC even for the
//! largest structs (Basket, StopLoss). One sub-module per
//! account keeps cross-references explicit — `state::match::Match`,
//! `state::team::Team`, etc.
//!
//! Imports elsewhere should use `use crate::state::*;` to pull everything
//! in scope, or pick individual structs as needed.
//!
//! Note: as of the Phase B+2 spectator trim, `SpectatorBid` was removed.
//! The Basket and StopLoss entries still account for the bulk of the
//! per-account SIZE constants here.

pub mod enums;
pub mod game_config;
pub mod match_state;
pub mod team;
pub mod basket;
pub mod stop_loss;
pub mod villain_pick;
pub mod chaos_event;
pub mod proposal;
pub mod round_counter;

pub use enums::*;
pub use game_config::*;
pub use match_state::*;
pub use team::*;
pub use basket::*;
pub use stop_loss::*;
pub use villain_pick::*;
pub use chaos_event::*;
pub use proposal::*;
pub use round_counter::*;

// File-name collision note:
// `state::match_state` instead of `state::match` — `match` is a reserved
// Rust keyword and would fail to compile as a submodule name even inside
// the `#[allow(...)]` workaround. Re-exports below preserve the public
// `state::Match` symbol so callers (and the IDL) keep working unchanged.
