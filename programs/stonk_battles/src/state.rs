// Archived modular reference — content lives in src/lib.rs (Phase A MVP
// flat layout). See ADR 0002 for why a true multi-module split is blocked
// (Anchor 1.2 `#[derive(Accounts)]` injects `pub(crate) mod
// __client_accounts_<ix>` helpers, which cannot be `pub use`'d).
