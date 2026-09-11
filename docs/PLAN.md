# MagicBlock Blitz v8 — Stonk Battles (Path A) Implementation Plan

## Context

Solo dev, 5-day build window (Sep 4–11, 2026). Building **Stonk Battles** for MagicBlock Blitz v8 ("Global Startup Village"). Pitch: team-vs-team real-time chicken game with hidden stop-losses via PER, multi-token baskets, sealed spectator prediction market via PER, villain token + chaos events via VRF, and FTR-token governance over a 2-round mini-season. Hard requirement: integrate ER, PER, or VRF.

**Scope (Path A — Mini-Season, live 2-round demo):**
- Round 1: full game loop (chicken + multi-token basket + hidden stop-losses via PER + sealed spectator market via PER)
- End-of-round-1 governance action: winning team votes on a league parameter
- Round 2: faster replay with the new parameter
- Demo stitches the 2-round arc into a narrative

**Why phasing:** the breif.md explicitly calls for a critical 4–6 hour spike of the ER/PER delegation + state-subscription flow before any feature work; ER routing and PER permission lifecycle are still maturing. Each later phase builds on the prior, so a stuck phase surfaces early instead of cascading into a wasted demo.

**Source of truth for the brief:** `/home/rujul/projects/a/blitz-v8/breif.md` — read-only reference, not modified.

## Repo layout (Path A → conviction)

Project root: **`/home/rujul/projects/conviction/`** (sibling of `blitz-v8/`). Inside it:

| Path | Role | Line cap |
|---|---|---|
| `/home/rujul/projects/conviction/CLAUDE.md` | Tracking index: project context, current phase, recent decisions, pointer map. Edited on every phase boundary. | **300 lines hard cap** |
| `/home/rujul/projects/conviction/docs/PLAN.md` | Full implementation plan (this file's content). No cap. Read when entering a phase or after a long gap. | none |
| `/home/rujul/projects/conviction/docs/CHANGELOG.md` | Append-only log: phase boundary entries (Phase X start/end, what shipped, what's known-bad). | none |
| `/home/rujul/projects/conviction/docs/decisions/` | One ADR per material architectural choice (spike outcome, ORACLE source, VRF queue choice, etc.). | none |
| `/home/rujul/projects/conviction/programs/` | Anchor workspace (one program: `conviction`). | n/a |
| `/home/rujul/projects/conviction/app/` | Next.js 14 App Router app. | n/a |
| `/home/rujul/projects/conviction/supabase/` | `schema.sql`, RLS, Realtime config. | n/a |
| `/home/rujul/projects/conviction/tokens.json` | Locked 25-SPL curated universe (Safe/Wild/Moonshot). | n/a |
| `/home/rujul/projects/conviction/vercel.json` | Cron schedules for governance tally. | n/a |

`CLAUDE.md` is the **only** file the assistant re-reads at the start of every session; it must stay within 300 lines and must point at the full plan and the active phase. Detailed planning lives in `docs/PLAN.md` so we never exceed the cap.

## Stack (locked from breif.md, no changes)

| Layer | Tech |
|---|---|
| Programs | Anchor (Rust), one program for Game + FTR + Governance + VRF callbacks |
| MagicBlock | `ephemeral-rollups-sdk` v0.16.2 (`anchor`, `access-control`, `vrf` features) + `@magicblock-labs/bolt-sdk` v0.15.5 |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind + shadcn/ui |
| Animations | Framer Motion |
| Wallet | `@solana/wallet-adapter-react` (Phantom, Solflare, Backpack) |
| State | Zustand (client) + React Query (server) |
| Realtime | MagicBlock SDK websocket + Supabase Realtime (backup) |
| Prices | Birdeye API |
| RPC | Helius (devnet) + MagicBlock base/RPC router/ER FQDN |
| Hosting | Vercel |
| Token list | Hardcoded `tokens.json` (Safe / Wild / Moonshot tiers) |
| Backend (thin) | Supabase (Postgres + Realtime as fallback fanout only) + Helius webhook receiver + Vercel cron for governance tally |
| Testing | Anchor unit tests + `mb-stack` for delegation, Devnet for end-to-end |

---

## Phase 0 — Critical ER/PER Spike (GATE; pause before Phase A)

**Why first:** breif.md mandates this. If ER/PER state subscription from the frontend doesn't click in 4–6 hours, the entire architecture pivots. Stop everything until this lands.

### Deliverables
- Minimal Anchor program with one delegated PDA and a counter that can be incremented from the ER endpoint.
- Minimal Next.js page that subscribes to the same PDA, displays the counter, and reflects ER-side updates within ~1–2 s.
- Dual-connection wiring (base layer vs ER FQDN from router `getDelegationStatus`).
- One PER-protected PDA with an `EphemeralPermission` whose members list is set on the ER, then closed before undelegation.
- Local `mb-stack` workflow documented end-to-end (build → deploy → delegate → operate → commit → undelegate).

### Critical files (under `/home/rujul/projects/conviction/`)
- `spike/program/src/lib.rs` — counter program with `#[ephemeral]`, `delegate`/`commit`/`undelegate` instructions.
- `spike/app/app/page.tsx` — counter UI wired through `@solana/wallet-adapter-react`.
- `spike/app/lib/magicblock.ts` — base/ER/router connection factory + `getDelegationStatus` helper.
- `spike/app/lib/permissioned.ts` — PER permission create/update/close CPI calls.

`spike/` is throwaway: deleted once Phase A lands (we keep `docs/decisions/0001-spike-outcome.md` instead).

### Verification (must all pass before Phase A)
- `anchor test` runs the counter end-to-end on `mb-stack` (base → ER → commit).
- Wallet connects, sends a `bump` transaction, ER returns the new value back to the UI without a hard refresh.
- Router status check confirms `isDelegated: true` and the FQDN returned is the endpoint the transaction was sent to.
- For PER, a non-permitted signer is rejected by the program on the ER; the permitted signer succeeds; closing the permission on the ER refunds rent; undelegating settles cleanly.

### Pause gate
If after 4–6 hours any of the above fails, surface the failure mode to the user and propose a pivot (Path B story-driven demo, or remove PER and ship only ER + VRF) before continuing. **Do not silently proceed.**

---

## Phase A — Anchor Program (pause before Phase B)

One Anchor program (`conviction`) owning game state, FTR mint, and governance. Uses ER for live state, PER for hidden commitments, VRF for villain + chaos events, L1 for settlement.

### Architecture (Path A scope)

| Account | Owner / derivation | Authority | Created on | Persistence | ER role | Privacy | Commit/close policy |
|---|---|---|---|---|---|---|---|
| `GameConfig` | `conviction`, PDA `[b"config"]` | Admin | Base | Base-settled | none | public | n/a |
| `FTRMint` | SPL Token | `ftr_authority` PDA | Base | Base-settled | none | public | n/a |
| `Match` | `conviction`, PDA `[b"match", match_id]` | Match creator | Base | Base-settled | delegated | public | commit-on-round-end, then undelegate |
| `Team` (×2 per match) | `conviction`, PDA `[b"team", match_id, side]` | Team leader | Base | Base-settled | delegated (read+write during round) | public | commit-on-round-end |
| `Basket` | `conviction`, PDA `[b"basket", match_id, side]` | Team leader | Base | Base-settled | delegated (write on ER during round) | **PER-private until reveal** | commit-on-reveal, then undelegate |
| `StopLoss` | `conviction`, PDA `[b"stop", match_id, side, player]` | Player | Base | Base-settled | delegated | **PER-private until reveal** | commit-on-reveal, then undelegate |
| `SpectatorBid` | `conviction`, PDA `[b"spec", match_id, spectator]` | Spectator | Base | Base-settled | delegated | **PER-private until reveal** | commit-on-reveal, then undelegate |
| `VillainPick` | `conviction`, PDA `[b"villain", match_id]` | Program (VRF callback) | Base | Base-settled | delegated (ER during round) | public | commit-on-reveal |
| `ChaosEvent` (Ephemeral Account) | `conviction`, PDA `[b"chaos", match_id, n]` | Sponsor PDA | ER-only | **ER-only ephemeral** | write | public | close at round end |
| `Proposal` | `conviction`, PDA `[b"prop", proposal_id]` | Proposer (FTR-weighted) | Base | Base-settled | none | public | n/a |
| `RoundCounter` | `conviction`, PDA `[b"round"]` | Admin | Base | Base-settled | none | public | n/a |

### Instruction set

**Base layer**
- `init_config(admin, ftr_authority, base_pot, round_duration_secs)` — admin only.
- `create_match(match_id, pot_amount)` — opens matchmaking, creates `Match` PDA, delegates `Match`.
- `register_team(match_id, side, players[])` — adds team leader + roster to one side.
- `lock_in_pre_round(match_id, side, player, basket_mints[2..3], stop_loss_ranges[2..3])` — initializes `Basket` and `StopLoss` PDAs, delegates them, opens an `EphemeralPermission` on the ER for each.
- `place_spectator_bid(match_id, spectator, prediction_payload_hash, amount)` — creates `SpectatorBid`, delegates, opens PER permission.
- `request_villain_vrf(match_id)` — calls `create_request_scoped_randomness_ix`, callback writes villain mint to `VillainPick` on ER.
- `request_chaos_vrf(match_id, scheduled_slot_offset)` — VRF request that picks chaos type (`rug`, `pump`, `fake_news`) at callback time.
- `commit_state(match_id)` — `MagicIntentBundleBuilder.commit(...)` for in-progress mutations during the round (used after price ticks / event firings; budget kept under 10 commits per round, otherwise re-delegate cycle).
- `reveal_round(match_id)` — closes PER permissions, copies plaintext to public `Match` PDA, computes worst-performer basket outcome, mints FTR to winners, optionally invokes `settle_spectators` Magic Action.
- `finalize_round(match_id)` — undelegates all delegated PDAs; VRF settle may be added as a Magic Action in `settle_spectators` if FTR mint should be a base-side effect.
- `propose_param_change(proposal_id, param_name, new_value)` — FTR-gated.
- `vote_on_proposal(proposal_id, voter, weight)` — FTR-balance snapshot via reflection from `FTRMint`.
- `tally_proposal(proposal_id)` — admin or anyone past deadline; updates `GameConfig`.

**ER-side (delegated-account operations)**
- `init_er_permission(stop_loss_pda | basket_pda | spectator_bid_pda, members)` — `CreateEphemeralPermissionCpi`, idempotent.
- `update_er_permission(...)` — `UpdateEphemeralPermissionCpi` (e.g., raise a stop-loss range mid-round).
- `close_er_permission(...)` — `CloseEphemeralPermissionCpi` (called by `reveal_round` before undelegation).
- `vrf_callback_villain(...)`, `vrf_callback_chaos(...)` — `#[vrf_callback]` contexts, idempotent.
- `tick_price(match_id, mint, price_e6)` — backend crank writes observed prices during round (capped to keep commits < 10).

### VRF plan
- Single `DEFAULT_EPHEMERAL_QUEUE` request from inside ER for villain at round start; `client_seed = match_id as u32`; `callback_args` carries `match_id`.
- Chaos events use the same queue with `callback_args = (match_id, scheduled_slot_offset)`; callback verifies the scheduled slot has passed.
- Both callbacks bind one randomness to one request, idempotent (check `VillainPick.randomness == [0;32]` before writing).
- Tests cover: duplicate callback, late callback after retry, two concurrent requests, queue mismatch.

### Commit/settlement economics
- Round lifecycle: create → lock_in → operate (≤10 commits) → reveal → settle → undelegate.
- Within budget: no fee-vault wiring for the MVP; re-delegate cycle handles any round that exceeds 10 commits.
- FTR mint to winners happens on `reveal_round` (committed through MagicIntentBundleBuilder if it must be a base-side effect, otherwise it's already on base via SPL CPI).
- Two pre-funded lamport top-ups: pre-fund `Basket` and `StopLoss` PDAs with `EphemeralPermission::size_of(MAX_PERMISSION_MEMBERS=8)` rent during `lock_in_pre_round`.

### Critical files (under `/home/rujul/projects/conviction/`, repo-relative below)
- `programs/conviction/Cargo.toml` — `ephemeral-rollups-sdk = { version = "0.16.2", features = ["anchor", "access-control", "vrf"] }`, `anchor-lang = "1.0.2"`, `anchor-spl`.
- `programs/conviction/src/lib.rs` — `#[ephemeral] #[program]` module with all instructions.
- `programs/conviction/src/state/mod.rs` — `GameConfig`, `Match`, `Team`, `Basket`, `StopLoss`, `SpectatorBid`, `VillainPick`, `Proposal`.
- `programs/conviction/src/instructions/delegate.rs` — per-account delegation + PER pre-funding.
- `programs/conviction/src/instructions/permission.rs` — `CreateEphemeralPermissionCpi` / `UpdateEphemeralPermissionCpi` / `CloseEphemeralPermissionCpi` wrappers.
- `programs/conviction/src/instructions/vrf.rs` — `#[vrf]` + `#[vrf_callback]` request/callback pair.
- `programs/conviction/src/instructions/reveal.rs` — closes PER, computes outcomes, mints FTR.
- `programs/conviction/src/instructions/governance.rs` — propose / vote / tally.
- `programs/conviction/tests/spike_e2e.ts` — full anchor-counter + VRF + PER round-trip on `mb-stack`.
- `tokens.json` — Safe/Wild/Moonshot curated SPL list (locked 25 tokens per breif.md).
- `app/lib/idl/conviction.json` — generated IDL.

### Reuse from skills
- `ephemeral_rollups_sdk::anchor::{vrf, vrf_callback, ephemeral, delegate, commit}` from `~/.claude/skills/magicblock/SKILL.md`.
- `create_request_scoped_randomness_ix` from `~/.claude/skills/magicblock/references/vrf.md`.
- `CreateEphemeralPermissionCpi` / `UpdateEphemeralPermissionCpi` / `CloseEphemeralPermissionCpi` from `~/.claude/skills/magicblock/references/delegation.md` (PER section).
- `MagicIntentBundleBuilder` for commit + undelegate (not the deprecated free functions) per the same reference.
- `ephemeral_rollups_sdk::ephem::FoldableIntentBuilder` trait import for chained `.commit(...)` calls (per `delegation.md`).
- `#[ephemeral_accounts]` context macro for `ChaosEvent` Ephemeral Account lifecycle per `~/.claude/skills/magicblock/references/ephemeral-accounts.md`.

### Verification
- `NO_DNA=1 anchor build` succeeds; IDL regenerates cleanly.
- `anchor test --skip-local-validator` against `mb-stack` (per `~/.claude/skills/magicblock/references/local-development.md`) exercises: create_match → lock_in (with PER) → villain VRF → tick_price → chaos VRF → reveal → FTR mint → undelegate.
- Program deployed to devnet via `anchor deploy --provider.cluster devnet`; program ID recorded in `app/lib/constants.ts`.
- Validation matrix from `~/.claude/skills/magicblock/references/composition-patterns.md` is exercised at least once for each: wrong runtime, expired permission, fresh price + stale commitment, duplicate callback, recovery from partial reveal.

### Pause gate
Stop and confirm with the user before opening Phase B. Surface: deployed program ID, IDL path, ER endpoint behavior in devnet (latency observed), any PER/VRF quirks that needed workarounds.

---

## Phase B — Frontend (pause before Phase C)

Next.js 14 App Router app. Mission-control feel. Realtime via MagicBlock SDK websocket subscriptions to delegated PDAs; Supabase Realtime as a fallback fanout for events that originate on L1.

### Pages / components
- `app/(marketing)/page.tsx` — landing, 3 buttons (Play / Spectate / Learn), live ticker.
- `app/(marketing)/onboarding/page.tsx` — 3-card first-time flow (pick team → set stop-loss → survive).
- `app/lobby/page.tsx` — open matches, "create match", live-now list, top-right FTR/win-rate/team-name.
- `app/lobby/new/page.tsx` — create-match form.
- `app/match/[id]/pre-round/page.tsx` — basket picker (3 tiers), hidden stop-loss ranges, find/confirm team, lock-in (triggers PER init).
- `app/match/[id]/live/page.tsx` — **Mission Control**: round timer, live basket prices (Birdeye + on-chain confirm), leaderboard, event feed, hold/fold/message buttons, live chat (Ephemeral Account-backed on ER), red banner on stop-loss hit.
- `app/match/[id]/reveal/page.tsx` — basket flip, stop-loss reveal, results, pot distribution, FTR earned, Whale Watcher badge if applicable.
- `app/governance/page.tsx` — single "propose" button + vote tally list (depth limited per breif.md).
- `app/spectate/[id]/page.tsx` — read-only mission control + place sealed prediction bid.

### Critical files (under `/home/rujul/projects/conviction/`, repo-relative below)
- `app/providers.tsx` — wallet adapter (`@solana/wallet-adapter-react`), ConnectionProvider (Helius), React Query provider, Zustand context.
- `app/lib/magicblock/client.ts` — dual-connection factory (base / router / ER FQDN) + `getDelegationStatus` helper, mirrors `~/.claude/skills/magicblock/references/typescript-setup.md`.
- `app/lib/magicblock/subscribe.ts` — `onAccountChange` wrapper that follows delegation status and re-subscribes when the ER endpoint rotates.
- `app/lib/magicblock/permissioned.ts` — TypeScript wrappers around the three PER CPIs.
- `app/lib/anchor/program.ts` — generated `@coral-xyz/anchor` Program instance per IDL.
- `app/lib/prices/birdeye.ts` — Birdeye fetcher with cache + fallback to on-chain oracle when available.
- `app/store/match.ts` — Zustand: match state, prices, event feed, hold/fold intent, ephemeral chat buffer.
- `app/store/user.ts` — wallet, FTR balance, win rate, auto-generated team name.
- `app/components/mission-control/PriceTicker.tsx`, `Leaderboard.tsx`, `EventFeed.tsx`, `HoldFold.tsx`, `ChaosBanner.tsx`, `RevealSequence.tsx`.
- `app/components/ui/*` — shadcn/ui primitives + Framer Motion wrappers.
- `app/lib/idl/conviction.json` — symlink or copied from program build.

### Realtime flow
- Subscribe to `Match`, `Team`, `Basket` (public view of commitments after reveal only), `VillainPick`, `ChaosEvent` on the ER FQDN via `connection.onAccountChange`.
- Subscribe to `StopLoss`, `SpectatorBid` through the program's PER-protected read path (returns sealed bytes until `reveal_round`).
- Subscribe to L1 events via Helius webhook → Supabase Realtime for governance vote updates, FTR balance changes, and round-end settlement.

### Tailwind/shadcn/Framer Motion design directives (per breif.md "the feel")
- First 30 s = stock-app feel: clean ticker, monochrome, micro-flash on price tick.
- Once the round starts: dim ambient, harder contrasts on chaos events, motion-blur reveal sequence, red banner on auto-fold.
- Reveal: card-flip cascade with Framer Motion staggered children.
- Loading states: skeletons; no spinners in mission control (always show last-known price with stale flag).

### Reuse from skills
- Dual-connection / router / ER FQDN pattern from `~/.claude/skills/magicblock/references/typescript-setup.md` (top-to-bottom).
- Wallet adapter stack per breif.md (locked); ignore the framework-kit suggestion in `~/.claude/skills/solana-dev/references/frontend-framework-kit.md` since the brief explicitly locks `@solana/wallet-adapter-react`.
- `DELEGATION_PROGRAM_ID`, `MAGIC_PROGRAM_ID`, `MAGIC_CONTEXT_ID` constants from `typescript-setup.md`.
- `GetCommitmentSignature` after every undelegate; separately confirm on the base layer (per the same reference).
- `connection.onAccountChange` skipPreflight note: keep preflight on for base-layer txs; only set `skipPreflight: true` for an ER path with a known simulation incompatibility, and document why.

### Verification
- `pnpm build` succeeds; no `'use client'` leak above leaf components (per `~/.claude/skills/solana-dev/references/frontend-framework-kit.md`).
- Wallet connects on devnet; `getDelegationStatus` returns expected ER FQDN for `Match` PDA during a live round.
- Locking in a stop-loss fires `lock_in_pre_round` → PER init → ER mutation visible in `app/match/[id]/live/page.tsx` within 1–2 s.
- Reveal page correctly reads public basket and stop-loss fields after `reveal_round` commits.
- Supabase Realtime backup channel updates the lobby ticker when a new `Match` is created (no ER dependency).
- Vercel preview deploy succeeds; env vars: `NEXT_PUBLIC_SOLANA_RPC_URL` (Helius), `NEXT_PUBLIC_BIRDEYE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Pause gate
Stop and confirm with the user before opening Phase C. Surface: which UI risks remain (especially the 15-min live round observability), what mock data is still used, and whether the demo flow stitches both rounds convincingly.

---

## Phase C — Backend (thin; Supabase Realtime as fallback only)

Single Next.js Route Handler + a Supabase project + one Vercel cron. No full indexer, no Birdeye cache (breif.md explicitly skips indexer; prices stay on Birdeye direct via React Query). Supabase Realtime exists only to fan out L1 events that the ER doesn't see (match_created, round_finalized, ftr_minted) so the lobby ticker and spectator list update before any ER subscription attaches.

1. **Webhook receiver** — Vercel route `/api/webhooks/helius` validates the Helius Enhanced signature, parses a tight allowlist of program addresses, and inserts one row per event into Supabase.
2. **Realtime fanout** — Supabase Postgres trigger on the `events` table broadcasts new rows over Supabase Realtime channel `events:global`. Frontend subscribes as a fallback to `app/lib/magicblock/subscribe.ts`.
3. **Governance tally cron** — `/api/cron/tally-proposals` (scheduled in `vercel.json`) finds proposals past their deadline, calls `tally_proposal` on chain, writes the updated `GameConfig` value to Supabase so the lobby reflects the new parameter without waiting for the next ER commit.

### Critical files (under `/home/rujul/projects/conviction/`, repo-relative below)
- `app/api/webhooks/helius/route.ts` — Helius webhook handler; signature verify; allowlist `conviction` program ID; insert into `events`.
- `app/api/cron/tally-proposals/route.ts` — cron-triggered proposal tally.
- `supabase/schema.sql` — tables: `events` (event_type, match_id, payload jsonb, created_at), `proposals` (id, param_name, new_value, deadline), `game_config_cache` (key, value, updated_at). Postgres trigger on `events` insert → `pg_notify` → Supabase Realtime.
- `app/lib/supabase/client.ts` — browser + server Supabase clients (anon key for read, service role for cron only).
- `app/lib/supabase/realtime.ts` — typed channel adapter (`on('events:global', ...)`) used as fallback in `app/lib/magicblock/subscribe.ts`.

### What this layer does NOT do (explicit, per breif.md)
- No full indexer of historical transactions.
- No Birdeye price cache (frontend reads Birdeye directly via React Query).
- No matchmaking or leaderboard service (handled by ER reads or by direct RPC fetches in the frontend).
- No Auth UI (wallet-only auth, Supabase RLS disabled for the MVP — single global realtime channel).

### Reuse / external
- `@supabase/supabase-js` (free tier).
- Helius Enhanced Webhooks (free devnet).
- `app/lib/anchor/program.ts` — shared with the frontend for the cron tally call.
- Vercel cron config in `vercel.json`.

### Verification
- End-to-end: create match on devnet → Helius webhook hits `/api/webhooks/helius` within ~5 s → row in `events` → Supabase Realtime broadcasts → lobby ticker on a freshly-loaded browser updates without any ER subscription.
- Cron: submit a proposal past its deadline, run `/api/cron/tally-proposals`, confirm `tally_proposal` tx succeeds on devnet and `game_config_cache` updates.
- Frontend falls back: stop the ER subscription mid-round (kill the FQDN), confirm the lobby still gets L1 events via Supabase Realtime within 1 s.

### Done gate (Path A complete)
- Both rounds playable on devnet with two browsers and a spectating third.
- Reveal animation triggers, FTR mints to winners, governance vote recorded.
- Round 2 starts with the new parameter (visible in the round timer) and visibly different rules.
- Lobby ticker reflects `match_created` and `round_finalized` without an ER subscription open.
- Vercel preview URL live; env vars set (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HELIUS_WEBHOOK_SECRET`).

---

## End-to-End Verification (Path A)

1. `NO_DNA=1 anchor build && NO_DNA=1 anchor test --skip-local-validator` (against `mb-stack`) passes the spike and program E2E suites.
2. `pnpm --filter web build` succeeds; Vercel preview URL serves the lobby.
3. Open two wallets, complete onboarding, create a match, lock in baskets + stop-losses, observe VRF villain reveal, trigger a chaos event, finish round 1 with auto-fold on one team, mint FTR to winners, vote on `round_duration_secs`.
4. Start round 2 with the new duration; observe the rule change reflected in the round timer.
5. Spectator wallet places a sealed bid via PER; reveals correctly; Whale Watcher recipient appears in the leaderboard for top predictors.
6. Helius webhook receiver logs the signature; Supabase Realtime channel broadcasts `round_finalized` within 1 s; lobby ticker on a third browser (no ER subscription open) updates; governance tally cron fires at the proposal deadline and `game_config_cache` reflects the new `round_duration_secs`.

## Out of Scope (explicit non-goals per breif.md)
Mobile native, full governance UI, on-chain reputation/NFTs, multi-chain, custom indexer beyond Helius webhooks, AI agents / MCP, live video / streaming.

---

## CLAUDE.md maintenance (300-line cap)

`/home/rujul/projects/conviction/CLAUDE.md` is the only file re-read at the start of every session. It stays small and up-to-date by following these rules:

1. **On every phase boundary**, edit `CLAUDE.md` so its top section shows:
   - current phase + status (in-progress / blocked / done),
   - the active pause gate (what we are waiting on before continuing),
   - the next 3–5 concrete tasks,
   - a one-paragraph risk note for the active phase.
2. **Phase start entries** get one line in `docs/CHANGELOG.md` (`- [Phase X start] YYYY-MM-DD — goal, scope, exit gate`).
3. **Phase end entries** get one block in `docs/CHANGELOG.md` (what shipped, what's known-bad, ADR pointers, demo URL).
4. **Material architectural decisions** (spike outcome, ORACLE source, VRF queue choice, PER member cap, etc.) become one ADR each in `docs/decisions/NNNN-slug.md`.
5. **Hard rule**: if `CLAUDE.md` exceeds 290 lines, prune before adding new content. Push detail to `docs/PLAN.md`, `docs/CHANGELOG.md`, or `docs/decisions/`.

Suggested `CLAUDE.md` skeleton (~120 lines, fits with growth room):

```markdown
# Conviction — Stonk Battles (Path A, MagicBlock Blitz v8)

> Source brief: /home/rujul/projects/a/blitz-v8/breif.md (read-only).
> Detailed plan: docs/PLAN.md.
> Append-only changelog: docs/CHANGELOG.md.
> ADRs: docs/decisions/.

## Current phase
Phase X — <name>. Status: <in-progress | blocked | done>.
Active pause gate: <one sentence>.
Known risks: <one short list>.

## Next 3–5 tasks
1. ...
2. ...
3. ...

## Pointers
- Program ID (devnet): <pubkey>
- ER FQDN for current round: <derived at runtime>
- Vercel preview: <url>
- Supabase project: <id>
- Helius webhook: <url>

## Skill references
- magicblock: ~/.claude/skills/magicblock/SKILL.md
- solana-dev: ~/.claude/skills/solana-dev/SKILL.md
```

---

## Bootstrap command (run once, in a fresh shell)

Paste the block below into a fresh terminal. It creates `/home/rujul/projects/conviction/`, writes the 300-line-cap `CLAUDE.md` tracking index, copies the full plan into `docs/PLAN.md`, sets up the directory skeleton, and `cd`s into the project. After it finishes, start Claude from that directory (`claude`) and the assistant will read `CLAUDE.md` first.

```bash
set -euo pipefail
ROOT=/home/rujul/projects/conviction
PLAN_SRC=/home/rujul/.claude/plans/go-through-the-breif-md-hazy-moler.md

mkdir -p "$ROOT"/{docs/decisions,programs,app,supabase,spike}

# 1. CLAUDE.md — tracking index, ~120 lines, must stay under 300.
cat > "$ROOT/CLAUDE.md" <<'CLAUDE_MD'
# Conviction — Stonk Battles (Path A, MagicBlock Blitz v8)

> Source brief (read-only): /home/rujul/projects/a/blitz-v8/breif.md
> Detailed plan: docs/PLAN.md
> Append-only changelog: docs/CHANGELOG.md
> ADRs: docs/decisions/

## Project
Solo dev, 5-day build window (Sep 4–11, 2026). MagicBlock Blitz v8. Path A =
Mini-Season, live 2-round demo. Hard requirement: integrate ER, PER, or VRF.
Stack locked in breif.md (Anchor, Next.js 14, Tailwind+shadcn, Framer Motion,
wallet-adapter-react, Zustand+React Query, Birdeye, Helius, Vercel).

## Current phase
**Phase 0 — Critical ER/PER Spike (gate).** Status: not started.
Active pause gate: must finish counter program + frontend subscription +
PER lifecycle on mb-stack before Phase A opens.
Known risks: ER/PER SDK still maturing; breif.md mandates 4–6 h budget.

## Next 3–5 tasks
1. `mkdir spike/{program,app}`; scaffold a minimal Anchor program with `#[ephemeral]` + delegate/commit/undelegate.
2. Add `@solana/wallet-adapter-react` provider; build a counter page that reads the PDA via the ER FQDN.
3. Wire `getDelegationStatus` router call; route txs to base vs ER.
4. Add PER: one `StopLoss`-shaped PDA, create/update/close `EphemeralPermission` on the ER.
5. Run `mb-stack`, verify counter increments show in UI within ~1–2 s; document outcome in `docs/decisions/0001-spike-outcome.md`.

## Pointers
- Program ID (devnet): TBD — set after Phase A deploy.
- ER FQDN: derived at runtime via router `getDelegationStatus`.
- Vercel preview: TBD — set in Phase B.
- Supabase project: TBD — set in Phase C.
- Helius webhook: TBD — set in Phase C.
- Plan file: docs/PLAN.md (read this for the full design).

## Repo skeleton
```
conviction/
├── CLAUDE.md                # this file (≤300 lines)
├── docs/
│   ├── PLAN.md              # full plan (from breif.md planning session)
│   ├── CHANGELOG.md         # append-only phase log
│   └── decisions/           # one ADR per material choice
├── programs/
│   └── conviction/       # one Anchor program (Phase A)
├── app/                     # Next.js 14 (Phase B + C routes)
├── supabase/                # schema.sql, RLS, Realtime config
├── spike/                   # throwaway Phase 0 work, deleted after Phase A
├── tokens.json              # locked 25-SPL curated universe
└── vercel.json              # cron schedules
```

## Skill references
- magicblock (ER/PER/VRF): ~/.claude/skills/magicblock/SKILL.md
- solana-dev (Anchor/PDAs/testing): ~/.claude/skills/solana-dev/SKILL.md

## Operating rules for Claude sessions in this repo
1. Always read CLAUDE.md first; treat it as the source of truth for current state.
2. Read docs/PLAN.md before entering a new phase or after a long gap.
3. On every phase boundary: update CLAUDE.md (current phase, next tasks, risks), append one line to docs/CHANGELOG.md, and write an ADR if a material decision was made.
4. Hard 300-line cap on CLAUDE.md — prune before adding. Push detail into docs/PLAN.md / docs/CHANGELOG.md / docs/decisions/.
5. Phase pauses: stop at every pause gate and wait for user confirmation.
CLAUDE_MD

# 2. Full plan -> docs/PLAN.md (no cap).
cp "$PLAN_SRC" "$ROOT/docs/PLAN.md"

# 3. Empty changelog.
: > "$ROOT/docs/CHANGELOG.md"

# 4. .gitignore basics.
cat > "$ROOT/.gitignore" <<'GI'
node_modules/
.next/
dist/
target/
.anchor/
.env
.env.local
*.log
.DS_Store
GI

# 5. Confirm.
echo "==> created $ROOT"
echo "==> CLAUDE.md:  $(wc -l < "$ROOT/CLAUDE.md") lines"
echo "==> PLAN.md:    $(wc -l < "$ROOT/docs/PLAN.md") lines"
echo
echo "Next: cd \"$ROOT\" && claude"
```

When the assistant starts in `/home/rujul/projects/conviction/`, it reads `CLAUDE.md`, sees that **Phase 0 — Critical ER/PER Spike** is the current phase and is not started, and picks up from there. The detailed plan is at `docs/PLAN.md` (the same content as this file).