# ADR 0003 — Phase B: frontend architecture, design-source conflicts, and the A.2 deploy defect

- **Status:** Accepted
- **Date:** 2026-09-07
- **Phase:** B (frontend)
- **Supersedes:** the Phase B route list in `docs/PLAN.md`; the palette in `docs/PHASE_B_BRIEF.md` / `docs/design-tokens.json`

## Context

Phase B builds the Next.js frontend. Three separate design/planning documents
existed and they did not agree, and the deployed Phase A.2 program turned out to
be non-functional. Both had to be resolved before any screen could be written.

## Decision 1 — `docs/DESIGN.md` is the authoritative design source

Conflicts found:

| Concern | `docs/DESIGN.md` | `PHASE_B_BRIEF.md` + `design-tokens.json` | Chosen |
|---|---|---|---|
| Background | `#0A0A0A` (true near-black) | `#0A0E13` (cool near-black) | DESIGN.md |
| Type | Space Grotesk / Inter / JetBrains Mono | Geist / JetBrains Mono | DESIGN.md |
| Radii | 4 / 6 / 12px, never above 12 | 6 / 12 / 24px | DESIGN.md |
| Accents | conviction/fold/hold/chaos/volatility semantics | up/down/villain/ftr/chaos/live | DESIGN.md |

**Rationale:** the user's instruction for this phase was explicitly to take
`DESIGN.md` for frontend decisions, and DESIGN.md is both the newer document and
the far more prescriptive one (it specifies the type contracts, the api surface,
component patterns, and an explicit "don't" list).

`PHASE_B_BRIEF.md` is still used where it does not contradict DESIGN.md:
the 12-column / 1200px / 4px-grid layout system, motion timings (120ms tick
flash, 600ms reveal with 80ms stagger, 1.5s live pulse, 180ms menu), and the
per-screen tone (pre-round calm, live war-room, reveal cinematic).

## Decision 2 — routes follow `DESIGN.md` §2, not `PLAN.md`

`(auth)/connect`, `(onboarding)/welcome`, `(game)/lobby`,
`(game)/match/[id]/setup`, `(game)/match/[id]/live`, `(game)/reveal/[id]`,
`spectate/[id]`, `governance`, `leaderboard`.

Notably `(game)/reveal/[id]` — **not** `/match/[id]/reveal` — and `setup` rather
than `pre-round`. DESIGN.md §14 says "don't create new file structures; follow
section 2 exactly", which makes it the tie-breaker. `CLAUDE.md` was updated to
match.

## Decision 3 — mock-first data layer

Every screen calls `api.X()` from `app/lib/api/index.ts`. `mock.ts` implements
it; `real.ts` is a documented stub. Reasons the deployed program cannot back
these screens today:

1. **No events.** The program contains zero `emit!` calls, so there is no event
   stream. Realtime must be `onAccountChange` diffs on delegated PDAs.
2. **Phase A.2 stubs.** `tick_price` validates the Live phase but persists no
   price; `callback_villain` leaves `villain_mint` as the default Pubkey;
   `reveal_round` mints a fixed 1 FTR to one winner.
3. **Shape gap.** On-chain `Match`/`Team` carry `score: u64` / `alive: u8` and
   no pnl, event log, spectator count, or FTR-weighted proposal tallies.
4. **Two missing instructions.** There is no `leaveMatch` handler and no manual
   fold handler — folding only happens via stop-loss or `finalize_round`.

`real.ts` records the exact handler mapping for every api method plus which
fields are DERIVED, so wiring is mechanical. This closes DESIGN.md §15.

## Decision 4 — React 18, no `ignoreBuildErrors`

The Phase 0 spike used `typescript.ignoreBuildErrors: true` to work around React
19 types leaking in through `@solana/wallet-adapter-*`. Phase B fixes the cause
instead: React 18.3 plus a `pnpm.overrides` pin on `@types/react` and
`@types/react-dom`. `pnpm build` passes with full type checking.

Also note: there is no `BackpackWalletAdapter` in `@solana/wallet-adapter-wallets`.
Backpack is detected via Wallet Standard, so only Phantom and Solflare are
constructed explicitly.

## Decision 5 — Anchor workspace restored, and the A.2 deploy defect fixed

The program crate was a non-standard standalone project (`Anchor.toml` and the
package manifest both inside `programs/conviction/`), so `anchor build` never
emitted an IDL. Restored the standard layout: root `Anchor.toml`, root Cargo
workspace, crate at `programs/conviction/`. `src/lib.rs` remains one flat
compile unit — ADR 0002's macro-hygiene blocker is unchanged and no module split
was attempted.

`anchor idl build` then failed with `E0599` on
`TokenAccount::create_type/insert_types/DISCRIMINATOR`. Root cause: the crate's
`idl-build` feature only forwarded to `anchor-lang/idl-build`, never to
`anchor-spl/idl-build`. Adding it produced a correct IDL (26 instructions,
10 accounts, 13 errors, 0 events).

**The significant finding:** `anchor idl init` then failed with
`DeclaredProgramIdMismatch` (4100). Investigation showed the bytecode deployed
at `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` had the **old MVP program ID**
`DnoA4ZcLeP47K45ZUuWb1xyByg62kCo5rGgppnbxmu7P` baked in at byte offset 590029,
while the local rebuild had the correct ID at the same offset. The Phase A.2
redeploy had uploaded a binary built before `declare_id!` was updated.

Because Anchor checks `declare_id() == program_id` on entry, **every instruction
on the deployed program reverted with error 4100** — the program was live but
completely non-functional, contrary to `CLAUDE.md`'s "deployed and live on
devnet". Fixed by `solana program extend … 10240` (the loader requires a 10240-byte
minimum extension and the new binary was 64 bytes larger) followed by a
redeploy. On-chain bytecode is now byte-identical to `target/deploy/conviction.so`.

## Consequences

- The design-token JSON and PHASE_B_BRIEF palette are now dead for color
  purposes. Anyone reading them first will be misled — they carry no warning.
- `docs/PLAN.md`'s Phase B route list is stale.
- `lib/idl/conviction.{json,ts}` are checked in, so the frontend needs no
  network fetch at build time. They must be regenerated if `lib.rs` changes.
- Swapping to on-chain data is a one-line change in `lib/api/index.ts`, but is
  gated on the four gaps listed in Decision 3.

## Debt carried forward

| Item | Verdict |
|---|---|
| IDL account not published on chain (`InstructionFallbackNotFound`, anchor-cli 0.31.1 vs anchor-lang 1.0.2; `#[ephemeral]` likely displaces the IDL fallback) | debt — IDL JSON on disk is sufficient |
| No `emit!` events in the program | debt — forces `onAccountChange` |
| No `leaveMatch` instruction | debt — UI currently mock-only |
| No manual fold instruction | debt — blocks the core action from going on-chain |
| `tick_price` persists no price | debt — chart history is client-side only |
| `callback_villain` placeholder mint | debt — villain reveal is mock-only |
| `reveal_round` mints 1 FTR to one winner | debt — carried from ADR 0002 |
| On-chain stop-loss is a bps *range*, UI models per-token threshold | debt — reconcile before wiring |
| VRF oracle → callback round-trip never run end to end on devnet | debt — carried from ADR 0002 |
| `lib/idl/conviction.ts` is 3,487 lines, over the 300-LOC cap | accepted — generated file |
