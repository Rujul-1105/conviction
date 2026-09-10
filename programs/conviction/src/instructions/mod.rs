//! Per-ix instruction modules.
//!
//! Each submodule `mod.rs <ix_name>;` exports one `pub struct` (the Accounts
//! struct with whatever attributes the handler needs) and one `pub fn handler`
//! that carries the original `lib.rs` body verbatim. The handlers' result type
//! is `anchor_lang::Result<()>`; signatures match the generated IDL.
//!
//! The `lib.rs` `[#program]` mod references each via the cross-module syntax
//! `instructions::<ix_name>::<Accounts_struct>` and forwards to
//! `instructions::<ix_name>::handler(ctx, ...)`. This indirection is what
//! makes per-ix files viable despite `#[program]` needing to resolve helper
//! modules at the crate root — see ADR 0002 addendum for the `pub use` chain.

pub mod callback_chaos;
pub mod callback_villain;
pub mod commit_match_state;
pub mod create_match;
pub mod delegate_basket;
pub mod delegate_match;
pub mod delegate_stop_loss;
pub mod delegate_team;
pub mod finalize_round;
pub mod fold;
pub mod init_basket_permission;
pub mod init_config;
pub mod init_ftr_mint;
pub mod init_stop_loss_permission;
pub mod leave_match;
pub mod lock_in_pre_round;
pub mod propose_param_change;
pub mod register_team;
pub mod request_chaos_vrf;
pub mod request_villain_vrf;
pub mod reveal_round;
pub mod tally_proposal;
pub mod tick_price;
pub mod vote_on_proposal;
