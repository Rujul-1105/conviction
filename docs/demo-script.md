# Demo Script — Path A 2-Round Mini-Season

Captured during Phase 5 rehearsal. Two-player demo on MagicBlock devnet.

## On-chain bootstrap (one-time, already done 2026-09-10)

- **Program:** `Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH`
- **GameConfig PDA:** `54Lyv5mQqUm2z5hCp4nzDWSWwRZUViohvRt82kkgeti2`
- **RoundCounter PDA:** `7tizNzRh66ah4jB4HzEG7nHryNv2hvyV38fb4BPdTkwS`
- **FTR mint:** `21Rki1gfiUYbM4bdyhma4TRWjYeS1SCXNb8ENKqsTr7V` (decimals = 6)

Run `pnpm --filter conviction run init-devnet` from the workspace root to
re-initialise. The script is idempotent and writes the FTR mint keypair to
`programs/conviction/.ftr-mint.json` so re-runs don't try to init twice.

## Round 1 — 15 min live

| Step | Action | Signer | Outcome |
|---|---|---|---|
| 1 | `createMatch(1, 1_000_000_000)` | operator wallet | Match PDA created + delegated to ER |
| 2 | `registerTeam(1, 0, [wallet_B])` | wallet B | Team 0 PDA created |
| 3 | `registerTeam(1, 1, [wallet_C])` | wallet C | Team 1 PDA created |
| 4 | `lockInPreRound(1, 0, [SOL, JUP, WIF], [3333,3333,3334], {-1500,-500}, ...)` | wallet B | Basket + StopLoss PDAs created, delegated, PER sealed |
| 5 | `lockInPreRound(1, 1, [BONK, BOME, GIGA], [-1500,-500}, ...)` | wallet C | same |
| 6 | `requestVillainVrf(1)` | operator | VRF request submitted; callback fires after ~1 slot |
| 7 | `callbackVillain(1, randomness)` | VRF oracle | VillainPick.villain_mint = TOKEN_UNIVERSE[idx] |
| 8 | `requestChaosVrf(1, 0)` | operator | chaos event queued |
| 9 | `tickPrice(1, mint, price_e6)` ×10 | operator crank | Match.last_prices_e6[slot] updated |
| 10 | team B auto-folds (P&L breaks basket floor) | ER auto | Team 0.alive = 0, Team 0.folded = true |
| 11 | `revealRound(1)` | operator | PER closed; 1 FTR minted to wallet B |
| 12 | `finalizeRound(1)` | operator | match state committed + undelegated |

## Governance between rounds

| Step | Action | Signer | Outcome |
|---|---|---|---|
| 13 | `proposeParamChange(1, "duration\0\0\0...", 600)` | wallet B (winner) | Proposal PDA created |
| 14 | `voteOnProposal(1, true)` | wallet C | FTR balance snapshot, vote recorded |
| 15 | `tallyProposal(1)` | operator (or anyone after deadline) | GameConfig.round_duration_secs = 600 |

## Round 2 — 10 min live (per governance)

Identical to round 1 except round_duration_secs reads 600 from GameConfig,
which the round timer UI must observe on the live page. The demo video
cuts to a "Rule change" overlay here.

## Demo narration beats

1. **Tension** (0–3 min): baskets set, stop-loss band set, villain reveal.
2. **Chaos** (5–7 min): operator-triggered chaos event rug/pump, both
   baskets still inside the band.
3. **Auto-fold** (8–10 min): one team's basket breaks the floor; the chart
   shows the band overlay, the pill flips to "Auto-fold armed", the team
   status flips to `folded` in the leaderboard.
4. **Reveal** (15 min): baskets flip, stop-losses reveal, pot distribution,
   FTR mint to winner.
5. **Governance vote** (15:30): winner proposes round duration change.
6. **Round 2 starts** (16:00): round timer now reads 10 min.

## Recorded deliverables

- `demo/round1.mp4` — round 1 from both wallets + spectator view
- `demo/round2.mp4` — round 2 with new rule visible in the timer
- `demo/onchain-evidence.txt` — `solana logs` excerpt showing the ix sequence

(Phase 5 captures these via screen recording during rehearsal.)