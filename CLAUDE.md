# Conviction — Stonk Battles (Path A, MagicBlock Blitz v8)

> Source brief (read-only): /home/rujul/projects/a/blitz-v8/breif.md
> Detailed plan: docs/PLAN.md
> Append-only changelog: docs/CHANGELOG.md
> ADRs: docs/decisions/
> Phase B design brief: docs/PHASE_B_BRIEF.md
> Design tokens: docs/design-tokens.json

## Project
Solo dev, 5-day build window (Sep 4–11, 2026). MagicBlock Blitz v8. Path A =
Mini-Season, live 2-round demo. Hard requirement: integrate ER, PER, or VRF.
Stack locked in breif.md (Anchor, Next.js 14, Tailwind+shadcn, Framer Motion,
wallet-adapter-react, Zustand+React Query, Birdeye, Helius, Vercel).

## Current phase
**Phase 4 — Birdeye live prices (source-only, uncommitted).** Phase 3
committed at `020fafc`. Phase 4 wires `useBirdeyePrices` into
`price-chart.tsx`: every 10s, prices are pulled for every mint across all
team baskets, P&L is derived from basket weights × price change vs entry,
and a "Birdeye live" / "Mock walk" pill in the chart header signals the
data source. When the key is missing or Birdeye 401s, the chart falls
back to its seeded mock walk and a Sonner toast warns the operator.
`pnpm typecheck` + `pnpm build` clean. Plan: `/home/rujul/.claude/plans/what-all-are-the-velvet-umbrella.md`.

> **Phase A.2 correction:** the bytecode deployed at `Fh6b…` had the *old* MVP
> program ID baked in as `declare_id`, so every instruction reverted with
> `DeclaredProgramIdMismatch` (4100) — the program was live but non-functional.
> Fixed in Phase B by `solana program extend … 10240` + redeploy. On-chain
> bytecode is now byte-identical to `target/deploy/conviction.so`.

## Design source of truth
**`docs/DESIGN.md` wins for all frontend decisions** (ADR 0003). It supersedes:
- the palette/type/radii in `docs/PHASE_B_BRIEF.md` + `docs/design-tokens.json`
  (those specify `#0A0E13`/Geist/6-12-24; DESIGN.md specifies `#0A0A0A`/Space
  Grotesk+Inter/4-6-12). The brief is still used for layout grid, motion
  timings, and per-screen tone.
- the Phase B route list in `docs/PLAN.md`.

## Routes (DESIGN.md §2 — authoritative)
`/` · `/connect` · `/welcome` · `/lobby` · `/match/[id]/setup` ·
`/match/[id]/live` · `/reveal/[id]` · `/spectate/[id]` · `/governance` ·
`/leaderboard`
(note: `reveal/[id]`, NOT `match/[id]/reveal`; `setup`, NOT `pre-round`)

## Next 3–5 tasks (Phase C / real-wiring path)
1. Deploy `app/` to Vercel (Root Directory = `app`). Set
   `NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.magicblock.app/devnet`,
   `NEXT_PUBLIC_ROUTER_ENDPOINT`, `NEXT_PUBLIC_BIRDEYE_API_KEY`.
   See `app/.env.example`.
2. Close the four blockers before `real.ts` can replace `mock.ts` — all
   documented inline in `app/lib/api/real.ts`: add a manual `fold` instruction,
   add `leave_match`, make `tick_price` persist a price, finish
   `callback_villain`'s mint selection.
3. Reconcile the stop-loss model: on-chain `StopLoss.range` is a single bps
   range; the UI models one threshold per token.
4. Wire realtime via `onAccountChange` on delegated PDAs (`lib/magicblock.ts` is
   ported and typed) — the program emits **no events**, so account diffs are the
   only signal.
5. Phase C: Supabase schema + Helius webhook for the L1 event fallback.


## Pointers
- Program ID (devnet, Phase A.2): `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` — conviction.
- (Deprecated) MVP ID: `DnoA4ZcLeP47K45ZUuWb1xyByg62kCo5rGgppnbxmu7P` — closed during A.2 redeploy.
- Phase 0 counter (still live on devnet): `2Prk1oV522ED8ytsHXXxLYfBaPVYSHLEwRoXg3At979`.
- ER FQDN: derived at runtime via router `getDelegationStatus`; observed
  `https://devnet-as.magicblock.app/`.
- MagicBlock devnet RPC: `https://rpc.magicblock.app/devnet`
- Router: `https://devnet-router.magicblock.app/`
- Vercel preview: TBD — set in Phase B.
- Supabase project: TBD — set in Phase C.
- Helius webhook: TBD — set in Phase C.
- Plan file: docs/PLAN.md.
- Design brief: docs/PHASE_B_BRIEF.md (color palette, typography, components).
- ADRs:
  - 0001 — Phase 0 spike outcome.
  - 0002 — Phase A MVP outcome + deviations; Phase A.2 outcome (final).
  - 0003 — Phase B: DESIGN.md authoritative, mock-first data layer, React 18
    pin, Anchor workspace restore + the A.2 `declare_id` deploy fix.

## Known risks (carried forward)
- **Anchor 1.2 macro hygiene** — **closed by ADR 0004.** Vendored
  `anchor-syn 1.2.0` patch (`pub(crate)` → `pub` on
  `__client_accounts.rs:190`); revert by removing `[patch.crates-io]` in
  root `Cargo.toml`.
- **Program emits no events** (zero `emit!`). Realtime must use
  `onAccountChange` on delegated PDAs, not event subscriptions.
- **No manual `fold` instruction and no `leave_match`** — folding only happens
  via stop-loss or `finalize_round`. Blocks the core action from going on-chain.
- `tick_price` persists no price, so chart history is client-side only.
- `callback_villain` leaves `villain_mint` as the default Pubkey.
- On-chain `StopLoss.range` is a bps range; the UI models one threshold per
  token. Reconcile before wiring `real.ts`.
- IDL account still not on chain — `anchor idl init` fails with
  `InstructionFallbackNotFound` (anchor-cli 0.31.1 vs anchor-lang 1.0.2;
  `#[ephemeral]` likely displaces Anchor's IDL fallback). Not blocking: the
  IDL JSON is checked in at `app/lib/idl/conviction.json`.
- `reveal_round` mints 1 FTR to a single winner; full rosters-walk + per-member
  minting is still outstanding.
- VRF callbacks tested at the instruction-surface level only; the actual
  MagicBlock oracle → callback round-trip on devnet wasn't run end-to-end.
- TEE-enforced PER membership: helper `require_member_of` is called from
  `init_*_permission` handlers (Phase 0 debt #1 closed). Runtime TEE check
  still applies in production.
- Local `mb-stack` env cap — environmental (carry from Phase 0). Verification
  continues on devnet.
- Phase 0 spike (`spike/`) still exists. Phase B ported the useful pieces
  (`magicblock.ts`, providers) — safe to delete once Phase B is confirmed shipped.

## Repo skeleton
```
conviction/
├── CLAUDE.md                # this file (≤300 lines)
├── Anchor.toml              # root (Phase B: standard workspace restored)
├── Cargo.toml               # [workspace] + [patch.crates-io] → vendor/anchor-syn (ADR 0004)
├── docs/
│   ├── PLAN.md              # full plan (Phase B routes are STALE — see ADR 0003)
│   ├── CHANGELOG.md         # append-only phase log
│   ├── DESIGN.md            # AUTHORITATIVE frontend spec
│   ├── PHASE_B_BRIEF.md     # layout/motion/tone only — palette superseded
│   ├── design-tokens.json   # superseded by DESIGN.md §1
│   └── decisions/           # ADRs 0001–0004
├── programs/
│   └── conviction/       # Anchor crate — src/ split per ADR 0004
│       ├── Cargo.toml       # anchor-lang 1.0.2, anchor-spl 1.0.2, ephemeral-rollups-sdk 0.16.2
│       └── src/
│           ├── lib.rs                  # ~50 LOC entry: declare_id + 26 aliases + 25 forwarders
│           ├── errors.rs               # ConvictionError (14 variants)
│           ├── constants.rs            # 11 SEED consts + MAX_PERMISSION_MEMBERS
│           ├── helpers.rs              # 6 free functions (PER + MagicBlock helpers)
│           ├── state/                  # 11 #[account] structs + 3 enums (per-file)
│           └── instructions/           # 25 per-ix files, each with Accounts struct + handler
├── target/                  # idl/conviction.json + deploy/conviction.so
├── app/                     # Next.js 14 frontend (Phase B — 10 routes)
│   ├── app/ components/ lib/
│   ├── tokens.json          # 25-SPL curated universe
│   └── vercel.json .env.example
├── supabase/                # schema.sql, RLS, Realtime config (Phase C)
└── spike/                   # Phase 0 reference — deletable now
```

## Skill references
- magicblock (ER/PER/VRF): ~/.claude/skills/magicblock/SKILL.md
- solana-dev (Anchor/PDAs/testing): ~/.claude/skills/solana-dev/SKILL.md
- emil-design-eng / design-taste-frontend: use when building Phase B UI.

## Operating rules for Claude sessions in this repo
1. Always read CLAUDE.md first; treat it as the source of truth for current state.
2. Read docs/PLAN.md before entering a new phase or after a long gap.
3. On every phase boundary: update CLAUDE.md, append one line to docs/CHANGELOG.md,
   and write an ADR if a material decision was made.
4. Hard 300-line cap on CLAUDE.md — prune before adding. Push detail into docs/PLAN.md
   / docs/CHANGELOG.md / docs/decisions/.
5. Phase pauses: stop at every pause gate and wait for user confirmation.
6. Source files: cap at 300 LOC of code (comments excluded); split modules when
   approaching the cap. **Phase A MVP was the only known violation;** the
   refactor described in ADR 0004 closed it — every file is now ≤150 LOC.
7. Comments required: per the source-comments-required preference, add explanatory
   comments at module, function, and macro-decision scopes.
8. At every pause gate: list failures / unfinished items with
   blocker / debt / nice-to-have verdicts.
9. At every pause gate: include manual-verification commands the user can run themselves.
10. The Anchor macro hygiene caveat is **closed by ADR 0004's `[patch.crates-io]`
    entry on `anchor-syn`**. If you ever need to revert the split (e.g. to
    chase an upstream macro fix), `rm` the `[patch.crates-io] anchor-syn`
    line in `Cargo.toml` and `git checkout -- programs/conviction/src/lib.rs`;
    the build will fail in its split form and the flat layout returns.
