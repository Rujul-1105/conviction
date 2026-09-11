# Conviction — Stonk Battles

> A real-time risk duel on Solana. Two teams each lock a 2-3 token basket
> behind a sealed threshold band; whoever's basket breaks out of the band
> first auto-folds, the survivor mints the round's governance token, and
> that token governs the next round.

Built for [MagicBlock Blitz v8](https://www.magicblock.app/). Path A =
live 2-round mini-season demo with on-chain ER + PER + VRF integration.

## What's shipped (MVP)

A deployable, end-to-end demo on MagicBlock devnet:

- **Anchor program** at `Fh6b…` — 24 instructions, 9 state accounts, 14
  error variants, all ≤150 LOC per file. Idempotent init script for
  GameConfig + FTR mint.
- **Next.js 14 frontend** — 10 routes (landing, connect, lobby, match
  setup, live, reveal, spectate, governance, leaderboard, welcome),
  full shadcn design system, Framer Motion FLIP animations, per-team
  sparklines + tooltip-driven stop-loss band, command palette.
- **`app/lib/api/real.ts`** — all 18 `ConvictionApi` functions wired
  against the on-chain program (zero `notWired` calls remaining).
- **Birdeye live prices** in the chart with seeded walk fallback + Sonner
  toast on 401.
- **MagicBlock helpers** ported from the Phase 0 spike: dual-connection
  base/ER, router `getDelegationStatus`, `subscribeToDelegatedAccount`.
- **Vercel deploy artifacts** — `app/vercel.json`, `app/.env.example`,
  `docs/deploy.md` with the 5-step manual flow.

On-chain pointers (devnet):

| Account | Address |
| | |
| Program | `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH` |
| GameConfig PDA | `54Lyv5mQqUm2z5hCp4nzDWSWwRZUViohvRt82kkgeti2` |
| RoundCounter PDA | `7tizNzRh66ah4jB4HzEG7nHryNv2hvyV38fb4BPdTkwS` |
| FTR mint | `21Rki1gfiUYbM4bdyhma4TRWjYeS1SCXNb8ENKqsTr7V` |

Explorer:
```
https://explorer.solana.com/address/Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH?cluster=devnet
```

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

**MagicBlock primitives and what they each carry in this design:**

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
├── programs/conviction/        # Anchor program (24 ix, 9 accounts, all ≤150 LOC)
│   ├── src/lib.rs             # declare_id + aliases + 25 forwarders
│   ├── src/state/             # 9 #[account] structs + 3 enums
│   ├── src/instructions/      # 24 per-ix files (fold, leave_match, …)
│   └── migrations/deploy.ts   # idempotent init_config + init_ftr_mint
├── target/                    # IDL JSON + BPF artifact
├── app/                       # Next.js 14 frontend (10 routes)
│   ├── app/                   # pages
│   ├── components/            # UI primitives + mission control + reveal + …
│   ├── lib/api/               # mock.ts + real.ts (against devnet)
│   ├── lib/anchor/            # PDA derivations + program factory + context
│   ├── tokens.json            # 25-SPL curated universe
│   └── .env.local             # 4 NEXT_PUBLIC_* vars (gitignored)
└── docs/
    ├── PLAN.md                # full phase plan (Phases 0-C)
    ├── DESIGN.md              # authoritative frontend spec
    ├── CHANGELOG.md           # append-only phase log
    ├── deploy.md              # Vercel deploy steps
    ├── demo-script.md          # 2-round mini-season demo narrative
    └── decisions/             # ADRs 0001-0005
```

## Build commands

```bash
# Program (devnet)
cd programs/conviction
NO_DNA=1 anchor build
NO_DNA=1 anchor deploy --provider.cluster devnet
pnpm install && pnpm run init-devnet   # idempotent

# Frontend (local)
cd app
pnpm install
cp .env.example .env.local            # fill in NEXT_PUBLIC_BIRDEYE_API_KEY
pnpm dev                               # http://localhost:3000
pnpm typecheck && pnpm build

# Frontend (Vercel)
npx vercel login && npx vercel link
npx vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
npx vercel env add NEXT_PUBLIC_ROUTER_ENDPOINT production
npx vercel env add NEXT_PUBLIC_NETWORK production
npx vercel env add NEXT_PUBLIC_BIRDEYE_API_KEY production
npx vercel deploy --prod
```

## License

Source-available for hackathon judging. Not licensed for redistribution.