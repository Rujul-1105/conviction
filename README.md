# Conviction — Stonk Battles

> A real-time risk duel on Solana. Two teams each lock a 2-3 token basket
> behind a sealed threshold band; whoever's basket breaks out of the band
> first auto-folds, the survivor mints the round's governance token, and
> that token governs the next round.

Built for [MagicBlock Blitz v8](https://www.magicblock.app/). Team vs team
risk-management game where three MagicBlock primitives (ER + PER + VRF)
each carry a load-bearing part of the design.

## MagicBlock integration

| Primitive | | What it does here |
| | |
| **Permissioned ER (PER)** | | Seals each team's threshold behind a member-set until `finalize_round` reveals. Without it, the rival reads your StopLoss PDA off base layer and front-runs the fold — the entire strategic layer disappears. |
| **MagicBlock VRF** | | Fires villain token + chaos-event callbacks mid-round. A trusted oracle breaks trust; a pre-committed hash breaks the cinematic. |
| **Ephemeral Rollups (ER)** | | Makes per-second price ticks cheap, fast, and ephemeral. On L1 every tick is a paid tx waiting on a 400ms slot, and every state change is permanent. ER keeps mid-round state off base and only settles the final result. |

## Repo layout

```
conviction/
├── CLAUDE.md                  # current state + operating rules (300 LOC cap)
├── Anchor.toml                # workspace + devnet cluster
├── Cargo.toml                 # workspace + [patch.crates-io] anchor-syn (ADR 0004)
├── programs/
│   └── conviction/            # Anchor program (50+ files, all ≤150 LOC)
│       ├── src/lib.rs         # declare_id + 24 aliases + 25 forwarders
│       ├── src/state/         # 9 #[account] structs + 3 enums
│       ├── src/instructions/  # 24 per-ix files (fold, leave_match, …)
│       └── migrations/         # idempotent init script (deploy.ts)
├── target/
│   ├── idl/conviction.json    # IDL JSON — also synced to app/
│   └── deploy/conviction.so   # BPF artifact
├── app/                       # Next.js 14 frontend (10 routes)
│   ├── app/                   # pages (marketing, onboarding, governance, etc.)
│   ├── components/            # UI primitives + mission control + reveal + …
│   ├── lib/
│   │   ├── api/               # mock.ts + real.ts (against devnet program)
│   │   ├── anchor/            # PDA derivations + program factory + context
│   │   └── magicblock.ts      # dual-connection helper (base + ER FQDN)
│   ├── tokens.json            # 25-SPL curated universe
│   └── .env.local             # 4 NEXT_PUBLIC_* vars (gitignored)
├── docs/
│   ├── PLAN.md                # full phase plan (Phases 0-C)
│   ├── DESIGN.md              # authoritative frontend spec
│   ├── CHANGELOG.md           # append-only phase log
│   ├── deploy.md              # Vercel deploy steps
│   ├── demo-script.md          # 2-round mini-season demo narrative
│   └── decisions/             # ADRs 0001-0005
└── spike/                     # Phase 0 reference code (deletable)
```

## Quick start (local)

```bash
# 1. Backend — bootstrap devnet (one-time, idempotent)
cd programs/conviction
pnpm install
pnpm run init-devnet          # init_config + init_ftr_mint
# Output prints: program_id, config_pda, ftr_mint

# 2. Frontend — dev server
cd ../../app
pnpm install
cp .env.example .env.local    # fill in NEXT_PUBLIC_BIRDEYE_API_KEY
pnpm dev                       # http://localhost:3000
```

Open **http://localhost:3000/spectate/spectate-demo** for a wallet-free
demo of the live-round mission control (uses the inline `SPECTATOR_FALLBACK`
when devnet has no matches yet).

## Quick start (Vercel)

See [`docs/deploy.md`](docs/deploy.md) — 5-step manual flow:

```bash
cd app
npx vercel login              # interactive
npx vercel link               # create project
npx vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
npx vercel env add NEXT_PUBLIC_ROUTER_ENDPOINT production
npx vercel env add NEXT_PUBLIC_NETWORK production
npx vercel env add NEXT_PUBLIC_BIRDEYE_API_KEY production
npx vercel deploy --prod
```

## On-chain pointers (devnet)

| Account | Address | Purpose |
| | |
| Program | `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` | conviction (24 instructions, 9 state accounts) |
| GameConfig PDA | `54Lyv5mQqUm2z5hCp4nzDWSWwRZUViohvRt82kkgeti2` | global config + round_duration_secs |
| RoundCounter PDA | `7tizNzRh66ah4jB4HzEG7nHryNv2hvyV38fb4BPdTkwS` | monotonically-increasing match_id |
| FTR mint | `21Rki1gfiUYbM4bdyhma4TRWjYeS1SCXNb8ENKqsTr7V` | SPL token, decimals 6 |

Explorer:
```
https://explorer.solana.com/address/Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH?cluster=devnet
```

## Demo script (2-round mini-season)

Full narrative at [`docs/demo-script.md`](docs/demo-script.md). The 5-beat
arc:

1. **Tension** (0-3 min): baskets set, band set, villain reveal
2. **Chaos** (5-7 min): VRF callback fires, both baskets still in band
3. **Auto-fold** (8-10 min): one team's basket breaks the floor
4. **Reveal** (15 min): baskets flip, stop-losses reveal, FTR minted to winner
5. **Governance** (15:30): winner proposes `round_duration_secs = 600`
6. **Round 2 starts** (16:00): timer reads 10 min, gameplay restarts

## Architecture

```
                         ┌─────────────────────────────┐
                         │  Next.js 14 (Vercel)         │
                         │                              │
                         │  app/lib/api/real.ts  ───┐  │
                         │  app/lib/anchor/*     ───┤  │
                         │  app/lib/magicblock.ts ───┤  │
                         └─────────────┬────────────┘  │
                                       │               │
                ┌──────────────────────┼───────────────┐
                │                      │               │
        ┌───────▼──────┐       ┌───────▼──────┐  ┌─────▼─────┐
        │ Base RPC     │       │ ER (per-PDA)  │  │ Birdeye   │
        │ (MagicBlock) │◄─────►│ via router    │  │ price API │
        └──────┬───────┘       └───────┬──────┘  └───────────┘
               │                      │
        ┌──────▼──────────────────────▼──────┐
        │ conviction program (Fh6b…)         │
        │  - 24 instructions                  │
        │  - 9 state accounts                  │
        │  - delegated to ER per match        │
        │  - PER-sealed baskets + thresholds  │
        │  - VRF callbacks for villain+chaos  │
        └─────────────────────────────────────┘
```

## Build commands

```bash
# Program
cd programs/conviction
NO_DNA=1 anchor build                                # rebuild + emit IDL
NO_DNA=1 anchor deploy --provider.cluster devnet     # deploy + extend if needed
pnpm run init-devnet                                 # idempotent init

# Frontend
cd app
pnpm typecheck                                       # tsc --noEmit
pnpm build                                           # next build
pnpm dev                                             # dev server on :3000
```

## Project status (2026-09-11)

| Phase | | Status |
| | |
| Phase 0 — ER/PER/VRF spike | | ✅ shipped |
| Phase A — conviction MVP | | ✅ shipped |
| Phase A.2 — VRF + PER + FTR | | ✅ shipped |
| Phase B — frontend (10 routes, mock-first) | | ✅ shipped |
| Phase B+ — per-ix file refactor | | ✅ shipped |
| Phase B+2 — spectator trim (26→23 ix) | | ✅ shipped |
| Phase 1 — on-chain gap fixes (fold + leave_match + tick_price persistence + callback_villain real mint) | | ✅ shipped + deployed |
| Phase 2 — basket-band UI fix | | ✅ shipped |
| Phase 3 — real.ts wire-up against devnet | | ✅ shipped |
| Phase 4 — Birdeye live prices | | ✅ shipped |
| Phase 5 — on-chain bootstrap (GameConfig + FTR mint) | | ✅ shipped |
| Phase 6 — Vercel deploy artifacts | | ⏳ manual deploy (docs/deploy.md) |
| Phase 7 — spectator mock-data fallback | | ✅ shipped |
| Phase 8 — frontend redesign | | ✅ shipped |

## What's deferred

- **Phase C** — Supabase Realtime fallback + Helius webhook receiver + governance tally cron. Out of scope for the 5-day build window; lobby ticker + governance tally fall back to page reload.
- **Per-member FTR minting** — `reveal_round` mints 1 FTR to a single winner; walking rosters + minting to each member's ATA is a post-MVP item.
- **VRF chaos** — chaos events are operator-triggered during demo for deterministic timing; production fires via VRF.
- **`onAccountChange` realtime** — `real.ts` polls `getRound` every 3s; the proper `connection.onAccountChange` flow lands once a production ER connection is wired in.
- **IDL account on chain** — `anchor idl init` fails with `InstructionFallbackNotFound` on devnet (`anchor-lang 1.0.2` vs `anchor-cli 0.31.1` mismatch). Not blocking — IDL JSON is checked in.

## License

Source-available for hackathon judging. Not licensed for redistribution.