# Vendored crates — Conviction

This directory carries local forks of upstream crates whose macro codegen
would otherwise block the per-instruction file split documented in
`/docs/decisions/0002-phase-a-mvp.md` (Phase A.2 addendum).

## anchor-syn @ 1.2.0

**Why vendored.** Anchor-lang 1.2.0 emits per-handler helper modules as
`pub(crate) mod __client_accounts_<ix> { … }`. That visibility is
incompatible with `#[program]`'s `pub use crate::__client_accounts_<ix>::*;`
once the `#[derive(Accounts)]` struct moves into a sub-module: Rust's
`pub(crate)` cannot be re-exported at the crate root (E0365).

**The patch.** A one-character visibility relaxation —
`pub(crate) mod #account_mod_name` → `pub mod #account_mod_name` — at
`src/codegen/accounts/__client_accounts.rs:190`. Behavior of the macro is
unchanged: the generated client module is identical in body; only its
visibility differs.

**Reverting.** Re-pin Cargo's `[patch.crates-io]` to upstream via:

```toml
# remove the [patch.crates-io] anchor-syn line; Cargo reverts to the registry copy
```

and restoring the upstream line is the diff in this README's "patch" section.

**Upstream status.** No anchor-lang release newer than 1.2.0 exists as of
2026-09-04. The `pub(crate)` line is byte-identical between 1.0.2 and 1.2.0.
No release note references a fix. We carry this vendor until the upstream
provenance changes.
