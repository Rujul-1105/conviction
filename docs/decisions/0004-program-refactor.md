# ADR 0004 — Program refactor: full split via vendored `anchor-syn` patch

**Status.** Accepted 2026-09-10 (Blitz v8 build window).
**Supersedes.** The "Phase A deviation" carry-forward clause of [ADR 0002](0002-phase-a-mvp.md).
**Reversibility.** Removing the `[patch.crates-io]` block in root `Cargo.toml` reverts to upstream `anchor-syn 1.2.0`; the crate then fails to compile in its split form, reverting to the flat `lib.rs` layout.

## Context

Phase A.2 left every instruction, state struct, error, and helper inside
a single `programs/conviction/src/lib.rs` of 1,297 lines. Phase B made the
frontend navigable, but the program was still flat. Two prior attempts
(documented in ADR 0002) failed — Anchor 1.0.0 / 1.2.0's `#[derive(Accounts)]`
macro emits helper modules as `pub(crate) mod __client_accounts_<ix>`,
and `pub(crate)` cannot be re-exported at the crate root (Rust E0365).

We confirmed by reading the macro source directly that the line has been
byte-identical across `anchor-syn` 1.0.2 → 1.0.3 → 1.1.0 → 1.1.1 → 1.1.2 →
1.2.0, and no anchor release note references a fix.

## Decision

**Vendor-patch `anchor-syn` 1.2.0 locally.** Flip one line in
`vendor/anchor-syn/src/codegen/accounts/__client_accounts.rs:190` from
`pub(crate)` to `pub`. Wire the patch in via `[patch.crates-io]` in the
workspace root `Cargo.toml`. Then run a full file split per the plan in
`/home/rujul/.claude/plans/snoopy-swimming-spring.md`.

## What ships

```
programs/conviction/src/
├── lib.rs                              # ~50 LOC: declare_id, mod decls, 25 pub use aliases, 26 aliases for #[client_accounts_<ix>], forwarders
├── errors.rs                           # ConvictionError (14 variants)
├── constants.rs                        # 11 SEED consts + MAX_PERMISSION_MEMBERS
├── helpers.rs                          # 6 free functions
├── state/
│   ├── mod.rs
│   ├── enums.rs                        # MatchPhase, ProposalStatus, ChaosKind
│   └── {game_config,match_state,team,basket,stop_loss,spectator_bid,villain_pick,chaos_event,proposal,round_counter}.rs
├── instructions/
│   ├── mod.rs
│   └── 25 per-ix files, each with its Accounts struct + handler body
└── vendor/anchor-syn/                  # vendored + patched copy
```

`lib.rs` (50 LOC) shrinks from 1,297 LOC. Every ix, every Accounts struct,
every state struct, every helper, every constant, every error variant lives
in its own dedicated file. The IDL JSON regenerates byte-equal (modulo
two `docs` blocks that anchor-cli 0.31.1 doesn't emit; the prior committed
IDL was generated with a newer-cli version that did).

> **Post-ADR trim (2026-09-10):** spectator bidding was dropped before submission.
> `place_spectator_bid` + `delegate_spectator_bid` + `init_spectator_bid_permission` + the
> `SpectatorBid` state struct were removed; on-chain instruction set is now **23**
> (not 26). The remaining structure is exactly what this ADR ships — file layout,
> vendored patch, alias bridge are unchanged. See CHANGELOG entry "Phase B+2 spectator trim".

The on-chain bytecode at `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH`
is re-deployed after `anchor build`. Same program ID, same instruction
discriminators, same discriminators — clients require no changes.

## Why we didn't take the partial-split alternative

The partial-split layout (state / errors / constants / helpers to
sub-modules; Accounts structs + `#[program]` mod staying in `lib.rs` at
~620 LOC) ships cleanly in 1–2 hours. But the user explicitly asked for
"ixs account structs and everything separate imported in a new file so
that it is easy to navigate through the program." Their stated goal is
full navigability. The vendor-patch unlocks exactly that and aligns with
the user's intent; the partial-split would have left ~620 LOC opaque
behind `#[derive(Accounts)]` constraints we already have the leverage to
break.

## Implementation notes (things we'd want a follow-on to know)

1. **`ctx_accounts_ident` quirk.** anchor-syn
   `parser/program/mod.rs:88` extracts `path.segments.first().ident`
   from `Context<X>` — i.e., the FIRST segment, not the leaf. Our
   forwarders inside `pub mod conviction` therefore must reference
   structs by their short name (`CreateMatch`, not
   `instructions::create_match::CreateMatch`). Solution: 25 re-exports
   at the crate root (`pub use instructions::create_match::CreateMatch;`)
   plus 26 `pub use ... as __client_accounts_<ix>;` aliases so
   `#[program]`'s `pub use crate::__client_accounts_<ix>::*;` resolves.

2. **`FoldableIntentBuilder` trait.** MagicBlock SDK 0.16.2 places
   `build_and_invoke` on the `FoldableIntentBuilder` trait, not the
   concrete `CommitIntentBuilder`. Each per-ix file using
   `MagicIntentBundleBuilder::commit(...).build_and_invoke()` must
   import the trait explicitly.

3. **Underscore-prefixed ix parameters carry into the IDL.** A function
   parameter named `_match_id` produces an IDL field named `_match_id`
   (with underscore). This is byte-faithful to the original — we
   preserved the underscore prefixes throughout the refactor.

4. **`///` vs `//!` doc comments.** Anchor's IDL generator only captures
   `///` (item-level) docs, not `//!` (module-level). Two struct files
   (`state/chaos_event.rs`, `state/villain_pick.rs`) originally had
   `//!` — fixed to `///` on the struct's lines. The committed IDL has
   the docs; the new IDL doesn't because anchor-cli 0.31.1 also doesn't
   emit them — this is a pre-existing CLI divergence, not a refactor
   regression.

## Verification

- `cargo check -p conviction` exits 0 (53 pre-existing warnings).
- `anchor build` produces `target/deploy/conviction.so` + `target/idl/conviction.json`.
- `anchor deploy --provider.cluster https://rpc.magicblock.app/devnet`
  succeeds; on-chain `executable: true`, owner
  `BPFLoaderUpgradeab1e11111111111111111111111`, same data size.
- `pnpm typecheck` exits 0 — frontend IDL client (`app/lib/idl/conviction.ts`)
  parses cleanly because the IDL JSON is functionally identical.

## Follow-up debt (carried forward)

- The vendor patch should be replaced with `Anchor`'s upstream fix the
  day that fix lands. Watch the
  [anchor-syn](https://github.com/coral-xyz/anchor) repo for the line
  flipping back to `pub` (or a `pub use` re-export pattern at the crate
  root).
- The two `docs` block divergences in IDL byte-equality are CLI-driven,
  not refactor-driven — but worth noting if byte-equality becomes a CI
  gate in the future.
