# Changelog — Stonk Battles (Path A)

Append-only phase log. Phase starts get a one-line entry; phase ends get a block
listing what shipped, what's known-bad, and ADR pointers. Newest entries first.

---

- [Post-deploy hotfix #3 2026-09-13, uncommitted] — Made `lock_in_pre_round` idempotent. The `Basket` and `StopLoss` PDAs used `#[account(init, …)]` (one-shot), so the second click of "Lock in" reverted with `already in use`. Now `init_if_needed` for both. Handler detects first-time init via `player == Pubkey::default()` and:
  - On first call: writes `match_id` / `side` / `player` / `bump`, calls `pre_fund_permission_rent` (the SOL transfer for the upcoming PER permission).
  - On re-locks: skips the immutable fields, skips the bump assignment, skips the rent pre-fund (it's a non-idempotent SOL transfer), and **preserves `stop_loss.hit`** so a triggered fold isn't accidentally cleared by a re-lock-in.
  Mutable fields (`mints`, `weights`, `range`, `per_members`, `per_flags`) update every call. Redeployed against existing `EvuchyGQK…` (no fresh ID). Required `solana program extend 10240` first — new binary 671,528 bytes vs prior 667,072 (4456-byte delta from the init_if_needed discriminator + handler branch). Files: `programs/conviction/src/instructions/lock_in_pre_round.rs`. IDL regenerated at `app/lib/idl/conviction.json`.

- [Post-deploy hotfix #2 2026-09-13, uncommitted] — Unblocked `/match/[id]/setup` lock-in. `StopLossRange.min_bps` / `max_bps` were declared `u16` on-chain, but the UI models them as signed negative values (e.g. `{ minBps: -1500 }` = "stop when loss exceeds 15%"). Borsh rejects negative inputs for `u16` at the serializer boundary, so the lock-in tx failed before reaching the wallet. The modal's `onError` swallowed the error (`toast.error('Lock-in failed')` with no detail), masking the actual cause. Fix: `u16` → `i16` in `programs/conviction/src/state/stop_loss.rs:10-11`. Account size unchanged (both are 2 bytes), no migration needed. Plus surfaced `err.message` in the toast + `console.error` so future failures aren't silent. Redeployed to the existing `EvuchyGQK…` program (in-place upgrade, no fresh ID — the on-chain program data account already had headroom from the prior `solana program extend 10240`). Files: `programs/conviction/src/state/stop_loss.rs`, `app/app/(game)/match/[id]/setup/page.tsx`. IDL regenerated at `app/lib/idl/conviction.json`.

- [Post-deploy hotfix 2026-09-13, uncommitted] — Unblocked `/lobby` match creation. Three concurrent bugs were masking each other:
  1. **Program:** `create_match` used `#[account(init, …)]` on the singleton `RoundCounter` PDA — worked once, then reverted with `already in use` on every subsequent match. Fix: `init_if_needed` + handler initializes `current_round` from 0 (or bumps existing counter). New `ConvictionError::Overflow` for the `checked_add` failure path.
  2. **Client:** `real.ts:createMatch` read `last.account.count.toNumber()` but the on-chain field is `currentRound` (camelCased from `current_round`). TypeError was silently swallowed by try/catch, so `matchId` always fell back to `Date.now() & 0xffffffff` and two clicks in the same second collided. Fix: read `currentRound`, log the warning, default `matchId = 1` on cold start.
  3. **Resilience:** `real.ts` passed `.accounts({})` to `.createMatch` (Anchor auto-filled authority from the provider wallet); now passes `{ authority: wallet.publicKey }` explicitly. Modal `onError` now surfaces `err.message` in toast + `console.error` so failures aren't silent.
  **Redeployed to a fresh program ID `EvuchyGQK4ZqBxYcr7hZUi4CmNUqMHZD6VbEH3iizVeh`** because `api.devnet.solana.com` was too congested for an in-place upgrade today (`solana program deploy` ran 30 sign attempts without finalizing); the in-flight deploy was cancelled and reissued against `https://rpc.magicblock.app/devnet` which finished in seconds. Third ID in the project's history (DnoA… → Fh6b… → EvuchyGQK…). `Fh6b…` is now also deprecated.
  On-chain bootstrap rerun against the new ID: GameConfig PDA `CsuWaugANEK32k68sUsbP4Baw89VFTis6twYXgUh9o7R` (118 bytes, owner `EvuchyGQK…`). RoundCounter PDA `E61ZYnompTd57nZt76tNAinFuzdJntbKcrDu4u5SJCWg` will be created on the first `create_match` call via `init_if_needed`.
  **IDL on-chain upload still debt** (ADR 0003) — the user opted to acknowledge, not chase. `anchor idl init` continues to fail with `InstructionFallbackNotFound`; the frontend uses the checked-in IDL JSON at `app/lib/idl/conviction.json` (regenerated with the new address).
  Files: `programs/conviction/src/instructions/create_match.rs`, `programs/conviction/src/errors.rs`, `app/lib/api/real.ts`, `app/components/lobby/create-match-modal.tsx`, `programs/conviction/src/lib.rs` (new `declare_id!`), `Anchor.toml`, `app/lib/idl/conviction.{json,ts}` (regenerated), `app/components/layout/footer.tsx`, `README.md`, `CLAUDE.md`. Plan: `/home/rujul/.claude/plans/i-am-not-able-delightful-sprout.md`.

- [Phase 8 source-only, uncommitted] 2026-09-11 — Frontend visual redesign pass. Global chrome (TopNav / LeftRail / Footer / Providers) + three signature screens (Landing, Live round, Reveal) hardened. Motto "HOLD . RESIST . SURVIVE." integrated at 8+ touchpoints (nav, hero accent, ticker footer, 404, governance empty, welcome slide 3, reveal final card, command palette group). Display scale extended to 96/128px (display-2xl/3xl) for the landing marquee. shadcn layer added — 9 components (Tooltip, Command, ScrollArea, Skeleton, Tabs, Popover, Progress, Avatar, DropdownMenu) + cmdk + 7 Radix peers = 9 new packages. Hardened hand-rolled primitives (MotionButton, Card winner tone, Dialog subcomponents + ink/85 backdrop, Num tone prop, Slider fold/30 fill, StatusPill dot size). In-repo extras: Countdown, Kbd, Sparkline, Marquee. Cross-screen: CommandPalette (⌘K / Ctrl-K / `/`) + NavUserMenu + useRecentsStore. Agency-grade copy replaces generic "Loading…" / "No data". Palette unchanged (DESIGN.md §1 already on-spec). SVG conversion of logos deferred. Favicon + icon.png + logo_icon@2x generated. ADR 0005 records the design direction. `pnpm typecheck` + `pnpm build` clean (11 routes).

- [Phase 7 source-only, uncommitted] 2026-09-10 — Spectator mock-data fallback. `real.ts` `getOpenMatches`/`getLiveMatches`/`getMatch` fall back to a cinematic inline fixture (`SPECTATOR_FALLBACK`) when no on-chain matches exist. Lets `/spectate/spectate-demo` render the demo narrative without seeding devnet first. No new dependencies. `pnpm typecheck` + `pnpm build` clean.

- [Phase 6 source-only, uncommitted] 2026-09-10 — Vercel deploy artifacts ready. Vercel CLI verified (npx vercel@latest → 59.15.1); deploy itself needs interactive login. `app/vercel.json` (Next.js + pnpm + iad1), `app/.env.example` (4 required env vars), `docs/deploy.md` (5-step manual flow + smoke test).

- [Phase 5 source-only, uncommitted] 2026-09-10 — On-chain bootstrap complete. `GameConfig` + `RoundCounter` + FTR mint initialised on devnet. Bootstrap script at `programs/conviction/migrations/deploy.ts` (idempotent). FTR mint keypair persisted to `programs/conviction/migrations/.ftr-mint.json` (gitignored). New conviction-crate `package.json` + `tsconfig.json` added so the bootstrap script can run via `pnpm --filter conviction run init-devnet`. Demo flow documented in `docs/demo-script.md`.

- [Phase 4 source-only, uncommitted] 2026-09-10 — Birdeye live prices wired into `price-chart.tsx`. `useBirdeyePrices` polls every 10s for every mint across team baskets; P&L derived from basket weights × price change vs entry. Chart header shows "Birdeye live" / "Mock walk" pill. Sonner toast on 401 / missing key, with seeded walk fallback. `pnpm typecheck` + `pnpm build` clean.

- [Phase 3 source-only, uncommitted] 2026-09-10 — real.ts wire-up landed locally. All 18 ConvictionApi functions implemented against `Fh6b…` on devnet (no `notWired(` calls remain). New files: `app/lib/anchor/pda.ts` (PDA derivations), `app/lib/anchor/program.ts` (Anchor Program factory), `app/lib/anchor/context.ts` (module-level mutable connection + wallet holder). `WalletContextBridge` in providers copies wallet-adapter state into context. `app/lib/api/index.ts` flipped from `mockApi` to `realApi`. Loose-typed throughout (Anchor's IDL generics aren't worth fighting for MVP). `pnpm typecheck` + `pnpm build` clean.

- [Phase 1.6 deploy] 2026-09-10 — Phase 1 source committed + redeployed to devnet at `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH`. Deploy required `solana program extend 10240` (new bytecode 661,696 bytes vs prior 656,728 — added 2 instructions + 25-entry TOKEN_UNIVERSE constant). Deploy tx `5fHLmsv9…`. On-chain bytecode matches local ELF (BPF loader header accounts for the 5KB on-chain-vs-local size delta).

- [Phase 2 source-only, uncommitted] 2026-09-10 — Basket-band UI fix shipped locally. Stop-loss slider rewritten to model one ±bps band for the whole basket (matches on-chain `StopLossRange`). `useRoundUIStore` swapped `stopLosses: Record<mint, number>` for `basketStopLossBand: { minBps, maxBps }`. `StopLossSlider` no longer takes a `tokens` prop. `PriceChart` renders a shaded fold-zone from `stopLossBand` prop. `Basket` API type uses `band: StopLossBand` not `stopLosses: StopLoss[]`. `StopLossStatus` shows band edges. Hard-coded teammate addresses removed from `TeamPicker`. `pnpm typecheck` + `pnpm build` clean.

- [Phase 1 source-only, uncommitted] 2026-09-10 — On-chain gap fixes shipped locally; devnet redeploy + commit pending. Added `fold` (voluntary team exit during Live; `#[commit]`) and `leave_match` (Created-phase withdrawal). Fixed `tick_price` to write `Match.last_prices_e6[0..=2]` and `callback_villain` to derive `villain_mint` from new `TOKEN_UNIVERSE: [Pubkey; 25]` constant mirroring `app/tokens.json`. State additions: `Team.folded: bool`, `Match.last_prices_e6: [u64; 3]`. IDL regenerated (24 user ix + 1 ephemeral = 25). `cargo check` + `anchor build` clean. Plan: `/home/rujul/.claude/plans/what-all-are-the-velvet-umbrella.md`.

- [Phase A pause gate] 2026-09-06 — Phase A.2 shipped; Phase B (Next.js frontend) unblocked. CLAUDE.md + design brief + design tokens prepared for the B1 session (frontend landing). Phase B1 next: scaffold `app/` from `pnpm create next-app` with the breif-locked stack, build the four pages per Plan.md, wire dual connection (base/router/ER fqdn), use Phase 0 spike as reference. New program ID `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` is the canonical anchor for the frontend.

- [Phase A.2 end] 2026-09-06 — VRF (villain + chaos), per-account `delegate_*`, ER-side PER init, FTR mint via SPL CPI, `vote_on_proposal` with FTR-balance snapshot all wired in the flat lib.rs. `cargo check` + `cargo build-sbf` clean. **Redeployed to a fresh program ID `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH`** because the previous ID `DnoA4Zc...` had its program-data account locked to the smaller MVP artifact (size mismatch — `solana program deploy` refused; `solana program close` released the slot but Solana treats the ID as "used"). New ID is the canonical one going forward. ADR 0002 extended.

- [Phase A.1 attempt] 2026-09-06 — Split-only attempt FAILED: Anchor 1.2.0's `#[derive(Accounts)]` injects `pub(crate) mod __client_accounts_<ix>` helpers that cannot be `pub use`'d at the crate root (Rust E0365). Three approaches tried (re-exports, `include!` splice, mod declarations) all blocked by the same macro hygiene. Reverted to flat lib.rs; modular files kept on disk as inert 2-line stubs. No source change vs MVP. ADR 0002 updated.

- [Phase A end (MVP)] 2026-09-06 — `conviction` program compiled + deployed to MagicBlock devnet at `DnoA4ZcLeP47K45ZUuWb1xyByg62kCo5rGgppnbxmu7P`. MVP flat-file layout (deviation from 300 LOC cap) — see ADR 0002. Two Phase 0 debts closed: TEE-gap member-check helper (`require_member_of`) defined, and all PER constants derived from `ephemeral_rollups_sdk::consts::*`.

## Phase A.2 artifacts

```
programs/conviction/
├── Anchor.toml              cluster = devnet, program_id pinned to Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH
├── Cargo.toml               deps: anchor-lang 1.0.2 + anchor-spl 1.0.2 + ephemeral-rollups-sdk 0.16.2 (anchor, access-control, vrf)
├── Xargo.toml
├── src/lib.rs               flat Phase A.2 surface (single file)
└── target/deploy/conviction.so   646,488 bytes BPF artifact
```

## Phase A artifacts (superseded by A.2 — same program, different ID)

```
(deprecated) conviction at DnoA4ZcLeP47K45ZUuWb1xyByg62kCo5rGgppnbxmu7P — MVP only
            closed during A.2 redeploy (program-data slot locked to MVP artifact size)
```

## Phase B — frontend (2026-09-07)

- Restored standard Anchor workspace (root `Anchor.toml` + Cargo workspace, crate at `programs/conviction/`); `src/lib.rs` stays flat per ADR 0002.
- Fixed `idl-build` feature to forward to `anchor-spl/idl-build` — was the E0599 blocker preventing any IDL from being emitted. IDL now generates: 26 instructions, 10 accounts, 13 errors, 0 events.
- **Found and fixed a Phase A.2 deploy defect:** bytecode at `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` had the old MVP ID `DnoA4Zc…` baked in as `declare_id`, so every instruction reverted with `DeclaredProgramIdMismatch` (4100). Extended program data by 10240 bytes and redeployed; on-chain bytecode now byte-identical to local.
- Scaffolded `app/` — Next.js 14 App Router, React 18.3, Tailwind, Framer Motion, TanStack Query, Zustand, Sonner, Radix primitives. `pnpm build` clean with full type checking (no `ignoreBuildErrors`).
- Authored `app/tokens.json` — the 25-SPL curated universe (8 safe / 10 wild / 7 moonshot), real mainnet mints. Did not previously exist anywhere in the repo.
- Built the mock-first data layer: `lib/api/index.ts` (contract), `mock.ts` + `mock-data.ts` + `mock-fixtures.ts` (cinematic demo data, 3s live subscription), `real.ts` (documented stub mapping every api call to its program handler — closes DESIGN.md §15).
- Shipped all 10 routes per DESIGN.md §2: landing, connect, welcome, lobby, match setup, live, reveal, spectate, governance, leaderboard.
- Verified post-hydration in headless Chromium: 17/17 checks pass, zero console errors — live feed ticks, timer counts down, fold flow works, pre-round wizard completes and routes to live, reveal renders under `prefers-reduced-motion`.
- Fixed three visual defects found by screenshot review: wallet-adapter's default purple button (palette violation on every page), overlapping event-feed rows (Framer `layout` FLIP), and an empty P&L chart on mount.
- ADR 0003 records: DESIGN.md as authoritative design source (supersedes PHASE_B_BRIEF/design-tokens palette), DESIGN.md §2 routes (supersedes PLAN.md), mock-first rationale, React 18 pin, and the deploy-defect fix.

```
app/
├── app/                    10 routes (route groups: (auth) (onboarding) (game))
├── components/             ui/ layout/ landing/ lobby/ pre-round/ live-round/ reveal/ spectate/ governance/
├── lib/
│   ├── api/                index.ts (contract) mock.ts mock-data.ts mock-fixtures.ts real.ts
│   ├── hooks/ store/       React Query hooks + Zustand stores
│   ├── idl/                conviction.json + conviction.ts (checked in, generated)
│   ├── colors.ts motion.ts utils.ts birdeye.ts magicblock.ts
├── tokens.json             25-SPL curated universe
└── vercel.json .env.example
```

- [Phase B+ program refactor] 2026-09-10 — `conviction` program split from a single 1,297-LOC `lib.rs` into 50+ files (one per instruction, one per state struct, `state/`, `errors.rs`, `constants.rs`, `helpers.rs`). Closes the Phase A deviation. Required vendoring `anchor-syn 1.2.0` and patching one line (`pub(crate)` → `pub` on `src/codegen/accounts/__client_accounts.rs:190`) so cross-module visibility works around the macro-generated helper module. Wired via `[patch.crates-io]` in root `Cargo.toml`. IDL JSON regenerates identically except two `docs` blocks that anchor-cli 0.31.1 doesn't emit (CLI-level, not refactor-level). Redeployed to devnet at `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` — same program ID, on-chain `executable: true`, same data size. Frontend `pnpm typecheck` still clean. ADR 0004 records the rationale + the rollback path (remove the `[patch.crates-io]` entry).

- [Phase B+2 spectator trim] 2026-09-10 — Dropped spectator bidding on-chain. Removed `place_spectator_bid`, `delegate_spectator_bid`, `init_spectator_bid_permission`, and the `SpectatorBid` state struct (with the matching `SPECTATOR_SEED` constant). On-chain instruction set: **26 → 23**. State accounts: 10 → 9. Spectator-class UI in the demo keeps the read-only `/spectate/[id]` view; bidding is mentioned in the demo narrative only. IDL regenerated; `app/lib/idl/conviction.{json,ts}` re-emitted and committed. Program redeployed to `Fh6b…` on devnet — same program ID, same discriminators for surviving 23 ix, on-chain executable confirmed.
