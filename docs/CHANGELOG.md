# Changelog — Stonk Battles (Path A)

Append-only phase log. Phase starts get a one-line entry; phase ends get a block
listing what shipped, what's known-bad, and ADR pointers. Newest entries first.

---

- [Phase A pause gate] 2026-09-06 — Phase A.2 shipped; Phase B (Next.js frontend) unblocked. CLAUDE.md + design brief + design tokens prepared for the B1 session (frontend landing). Phase B1 next: scaffold `app/` from `pnpm create next-app` with the breif-locked stack, build the four pages per Plan.md, wire dual connection (base/router/ER fqdn), use Phase 0 spike as reference. New program ID `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` is the canonical anchor for the frontend.

- [Phase A.2 end] 2026-09-06 — VRF (villain + chaos), per-account `delegate_*`, ER-side PER init, FTR mint via SPL CPI, `vote_on_proposal` with FTR-balance snapshot all wired in the flat lib.rs. `cargo check` + `cargo build-sbf` clean. **Redeployed to a fresh program ID `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH`** because the previous ID `DnoA4Zc...` had its program-data account locked to the smaller MVP artifact (size mismatch — `solana program deploy` refused; `solana program close` released the slot but Solana treats the ID as "used"). New ID is the canonical one going forward. ADR 0002 extended.

- [Phase A.1 attempt] 2026-09-06 — Split-only attempt FAILED: Anchor 1.2.0's `#[derive(Accounts)]` injects `pub(crate) mod __client_accounts_<ix>` helpers that cannot be `pub use`'d at the crate root (Rust E0365). Three approaches tried (re-exports, `include!` splice, mod declarations) all blocked by the same macro hygiene. Reverted to flat lib.rs; modular files kept on disk as inert 2-line stubs. No source change vs MVP. ADR 0002 updated.

- [Phase A end (MVP)] 2026-09-06 — `conviction` program compiled + deployed to MagicBlock devnet at `DnoA4ZcLeP47K45ZUuWb1xyByg62kCo5rGgppnbxmu7P`. MVP flat-file layout (deviation from 300 LOC cap) — see ADR 0002. Two Phase 0 debts closed: TEE-gap member-check helper (`require_member_of`) defined, and all PER constants derived from `ephemeral_rollups_sdk::consts::*`.

## Phase A.2 artifacts

```
programs/stonk_battles/
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

- Restored standard Anchor workspace (root `Anchor.toml` + Cargo workspace, crate at `programs/stonk_battles/`); `src/lib.rs` stays flat per ADR 0002.
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
