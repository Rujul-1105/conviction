# Debts & Upcoming Features

Living inventory of:

- **Debts** — known broken / incomplete / shortcut pieces of *existing*
  functionality. Documented so we don't ship with hidden failure modes.
- **Upcoming planned features** — net-new functionality on the roadmap
  (from PLAN.md, ADRs, DESIGN.md).

Cross-referenced from `CLAUDE.md`, `PLAN.md`, `CHANGELOG.md`, `DESIGN.md`,
all 5 ADRs, and a source sweep (last refreshed 2026-09-13).

**Definitions:**
- **Debt blocker** — breaks the demo narrative or a documented contract.
- **Debt degraded** — works around / hides a bug; user can ship but
  shouldn't.
- **Debt nice-to-have** — housekeeping / cleanup.
- **Feature** — net-new, on the roadmap, not yet built (or built but
  not wired into the demo).

---

## DEBTS (36 total)

### 🔴 BLOCKERS — break the demo narrative

| # | Debt | Where | Affects | Fix |
|---|---|---|---|---|
| 1 | **`reveal_round` mints 1 FTR to one winner** — no rosters-walk, no per-member distribution | `programs/conviction/src/instructions/reveal_round.rs:35-63` | Mini-season reveal sequence, FTR ledger, Whale Watcher | Walk both team rosters, mint per surviving member proportional to pot share |
| 3 | **VRF oracle → callback not exercised E2E on devnet** | `request_villain_vrf.rs`, `callback_villain.rs`, etc. | Headline villain reveal (cinematic moment) | Drive a real VRF request, verify `VillainPick.randomness` lands and `villain_mint ∈ TOKEN_UNIVERSE` |
| 7 | **Basket entry prices not stored on chain** — P&L is always 0 | `lock_in_pre_round.rs:34-44` (no snapshot); `real.ts:451-458` (stub) | Mission Control leaderboard, Reveal table, spectator view, whole P&L narrative | Snapshot `entry_prices_e6: [u64;3]` on Basket PDA at lock-in |
| 13 | **`subscribeToRound` polls every 3s** instead of using `onAccountChange` | `real.ts:461-482` (3s poll); `lib/magicblock.ts:113-142` (unused helper) | Live round latency; never sees basket/stop-loss/villain mutations on ER | Fan out one `subscribeToDelegatedAccount` per PDA |
| 23 | **Phase C Supabase backend doesn't exist** | No `supabase/` dir, no `app/lib/supabase/`, no `app/api/` | L1 event fanout (lobby ticker without ER subscription); governance realtime | Build schema + 3 TS modules + Helius webhook route |

### 🟡 DEGRADED — works around / hides bugs

| # | Debt | Where | Affects | Fix |
|---|---|---|---|---|
| 2 | **IDL account not on chain** — `anchor idl init` fails with `InstructionFallbackNotFound` | `CLAUDE.md` "Known risks"; ADR 0003 | Anyone wanting on-chain IDL discovery. Frontend works around via checked-in JSON | Upgrade anchor-cli to match anchor-lang 1.0.2, or hand-write IDL account |
| 4 | **`tick_price` uses Pubkey first-byte as slot index** — dirty encoding | `tick_price.rs:10-15, 44-48` | Every live-round price tick (works but ugly) | Replace `_mint: Pubkey` with `mint_index: u8` arg |
| 5 | **PDA helpers include a `side` byte the program doesn't use** — latent | `app/lib/anchor/pda.ts:79-106` (TS) vs `lock_in_pre_round.rs:27-29` (on-chain) | Any future direct call to `findBasketPda`/`findStopLossPda` (not in hot path today) | Drop `side` arg + `sideBuf` seed from both helpers |
| 6 | **`lockInPicks` never calls `init_basket/stop_loss_permission`** — PER pitch is hollow | `real.ts:369-415` | "Sealed until reveal" guarantee — non-permitted wallets could mutate basket | After delegate, call `init_*_permission` with player as sole member, bundle into `MagicIntentBundleBuilder` |
| 10 | **No Anchor TS integration tests on devnet** | `programs/conviction/tests/` (missing dir) | Every on-chain change is unverified. Hotfix history (3 deploys in 5 days) shows the cost | Add `tests/conviction.ts` under `mb-stack` + a devnet round-trip test gated on `ANCHOR_PROVIDER_URL` |
| 11 | **`Team::SIZE` hardcoded for 4 members, but `members` is a `Vec`** — 5th member reverts with no helpful error | `state/team.rs:33` | `register_team` edge case | Add `MAX_TEAM_MEMBERS = 4` const + `require!` guard |
| 12 | **`init_ftr_mint` requires a separate `admin` signer** | `init_ftr_mint.rs:14-22` | Future admin actions need bootstrap keypair | Persist admin keypair + implement 2-step rotation |
| 14 | **`getOpen/Live/Match` silently fall back to mock fixtures when devnet is empty** | `real.ts:202-264, 642-720` | Operator confusion — lobby/spectator look alive when devnet is dead | Add `mockFallbackEnabled` config flag; return `[]`/typed error otherwise |
| 15 | **`getFTRBalance` returns 0 on every error** | `real.ts:497-511` | Governance page always shows "0 FTR"; can't tell error from empty | Differentiate "ATA doesn't exist" from "RPC failed" |
| 17 | **`getProposals` hardcodes `proposerTeamId: 'team-1'` and `currentValue: '900'`** | `real.ts:524-543` | Governance page shows wrong proposer + wrong baseline | Derive from `account.proposer` + `GameConfig.round_duration_secs` |
| 18 | **Spectator bidding is dead-code on chain** | `real.ts:486-493`, `index.ts:191-195`, `prediction-panel.tsx` | Spectator "place bet" looks pending forever, never resolves | Either remove from API + UI, or re-introduce (Feature #5) |
| 22 | **`vote` ignores `isPrivate` flag end-to-end** | `index.ts:203` → `real.ts:574-582` | "Private vote" does nothing; Proposal struct has no privacy field | Remove `isPrivate` from API type, or add `is_private: bool` to Proposal + CPI |
| 24 | **Vercel cron schedule not registered** | `app/vercel.json` `"crons": []` | Governance tallies never run automatically | Add `/api/cron/tally-proposals` entry to `crons` |
| 25 | **Vercel deploy not yet executed** | `docs/deploy.md`; CHANGELOG Phase 6 | Demo URL is local-only; tournament submission needs hosted build | Run `vercel login` → `link` → `deploy --prod` + set 4 env vars |
| 26 | **`NEXT_PUBLIC_BIRDEYE_API_KEY` not yet set** | `app/.env.example`, `app/.env.local` | Deployed build shows "Mock walk" pill + seeded walk fallback | Provision public-tier key + set in Vercel production env |
| 29 | **`design-tokens.json` + `PHASE_B_BRIEF.md` palette are stale** (superseded by DESIGN.md §1) | `docs/design-tokens.json`, `docs/PHASE_B_BRIEF.md` color table | Anyone reading them first is misled on `#0A0E13` background | Add "SUPERSEDED by DESIGN.md §1" banner to both |
| 32 | **Birdeye 401 toast suppression** — gated on `NEXT_PUBLIC_DEMO_MODE` (not yet defined) | `app/lib/hooks/use-birdeye-prices.ts` | Deployed build with no Birdeye key spams toasts every poll | Add env var to `.env.example`, gate the toast |
| 36 | **Stale CLAUDE.md "Known risks" entries** — `fold`/`leave_match` shipped (Phase 1), StopLoss model reconciled (Phase 2) | `CLAUDE.md:118-126` | Misleads anyone reading CLAUDE.md as single source of truth | Strike both entries |

### 🟢 NICE-TO-HAVE — housekeeping

| # | Debt | Where |
|---|---|---|
| 8 | `finalize_round` naming inconsistency (struct vs ix) | `lib.rs:62, 91`; `finalize_round.rs:14` |
| 9 | Vendor-patched `anchor-syn` is a hard dep | `Cargo.toml` `[patch.crates-io]`; `vendor/anchor-syn/` |
| 16 | `createMatch` warns silently when counter fetch fails | `real.ts:276-306` |
| 19 | `mock.ts` + `mock-fixtures.ts` are dead in prod but bundled | `app/lib/api/index.ts:220`; `mock.ts` |
| 20 | `conviction.ts` IDL wrapper is 3,487 lines (over 300-LOC cap) | `app/lib/idl/conviction.ts` |
| 21 | Hardcoded fallback wallet addresses in `real.ts` | `real.ts:661, 682` |
| 27 | No mobile-native styling or responsive audit | Per-PHASE_B_BRIEF "Phase B1 anti-goals" |
| 28 | `spike/` still present and ungated | `/home/rujul/projects/conviction/spike/` |
| 30 | PLAN.md Phase B route list is stale (`/pre-round`, `/reveal/[id]/` paths) | `docs/PLAN.md:178-188` |
| 31 | SVG conversion of logos deferred | `app/logo/`; ADR 0005 §12 |
| 33 | Two IDL `docs` block divergences in committed IDL | `app/lib/idl/conviction.json`; ADR 0004 |
| 34 | Three deprecated program IDs still in CLAUDE.md "Pointers" | `CLAUDE.md:93-95` |
| 35 | `lib.rs` is 300 LOC (file-line cap deviation) — accepted by ADR 0004 | `lib.rs:9-16` (note) |

---

## UPCOMING FEATURES (25 total)

### Phase C — Supabase + Realtime (active next-phase)

| # | Feature | Source |
|---|---|---|
| 3 | Supabase schema + Helius webhook receiver (`/api/webhooks/helius` → Supabase Realtime `events:global`) | `PLAN.md §Phase C` |
| 4 | Governance tally cron (`/api/cron/tally-proposals`) updating `game_config_cache` | `PLAN.md §Phase C` |
| 12 | Frontend Supabase client + Realtime adapter (`app/lib/supabase/{client,realtime}.ts`) | `PLAN.md §Phase C` |
| 24 | Helius Enhanced webhook signature verification | `PLAN.md §Phase C:240` |

### Pre-demo / verification (must do before tournament)

| # | Feature | Source |
|---|---|---|
| 9 | End-to-end VRF oracle → callback round-trip on devnet | ADR 0002 "Not validated"; CLAUDE.md risks |
| 13 | Real Birdeye cache fallback (survives 401) | ADR 0005 "Follow-up debt" |
| 18 | Vercel production deploy + env vars | `docs/deploy.md`; CHANGELOG Phase 6 |

### Phase D / post-tournament

| # | Feature | Source |
|---|---|---|
| 5 | Re-introduce on-chain spectator bidding (`place_spectator_bid`, `SpectatorBid` PDA) | CHANGELOG "Phase B+2 spectator trim" |
| 6 | `reveal_round` rosters-walk + per-member FTR minting (depends on Debt #1) | ADR 0002 "Follow-up" item 5 |
| 7 | `onAccountChange` mirror replacing 3s poll | CLAUDE.md "Next 3–5 tasks" item 4 |
| 8 | `tick_price` API break: `mint_index: u8` (replace Pubkey-first-byte hack) | `tick_price.rs` file-level note |
| 10 | Anchor TS integration tests on devnet | ADR 0002 "Carry-forward" item 7 |
| 11 | IDL account publication on chain (close `InstructionFallbackNotFound`) | ADR 0003 "Debt carried forward" |
| 19 | Replace `mock.ts` with proper test fixtures (`__tests__/` or `NEXT_PUBLIC_DEMO_MODE` switch) | CHANGELOG "Phase 3" |
| 20 | Sponsor-PDA-based ChaosEvent cleanup at round end (rent refund) | `PLAN.md` architecture line 102 |
| 21 | Per-team vs per-player basket model reconciliation | DESIGN.md §10 priority 4; PLAN.md arch |
| 25 | `finalize_round` rename / struct-ix name alignment | `lib.rs:62, 91`; ADR 0004 |

### Future / out-of-scope but on the radar

| # | Feature | Source |
|---|---|---|
| 14 | Tailwind/shadcn layer trim follow-ups (`sheet`, `input`, `select`, `switch`, `checkbox`, `accordion`, `react-resizable-panels`) | ADR 0005 §5 |
| 15 | Mobile-native styling (true app-native, not responsive shim) | `PHASE_B_BRIEF.md` "Phase B1 anti-goals" |
| 16 | Profile / history / cross-match leaderboard persistence | `PHASE_B_BRIEF.md` "Phase B1 anti-goals" |
| 17 | Real-time chat inside Live page (Ephemeral Account on ER) | DESIGN.md §10 priority 5 |
| 22 | Match creator / authority controls (kick/settle/abort) | `Match.authority` exists; absent in DESIGN.md §4 |
| 23 | Reveal-time `settle_spectators` Magic Action (depends on Feature #5) | `PLAN.md` line 117 |

---

## Triage quick-guide

**Demo day:** pay down Blockers 1, 3, 6, 7, 13, 23. The rest can ship with
current degraded behavior.

**Clean post-tournament:** Blockers first, then Degraded items #2, #4, #5,
#10, #14–18, #24, #25, plus Features #3, #4, #11, #12.

**Phase C realtime story:** Features #3, #4, #12 first, then Degraded #14
to silence the devnet-dead fallback noise.

**Suggested smallest-impact first** (in priority order):
1. Debt #6 (PER init in `lockInPicks`) — touches the privacy pitch the
   demo leads with, ~30 lines.
2. Debt #7 (entry-price snapshot) — unblocks Debt #1 (reveal walk) and the
   whole leaderboard. ~50 lines + redeploy.
3. Debt #1 (reveal rosters-walk + per-member FTR mint).
