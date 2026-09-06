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
**Phase 0 — Critical ER/PER Spike (gate).** Status: **done** (verifying on
MagicBlock devnet, see ADR 0001).
Active pause gate: **awaiting user confirmation before Phase A opens**.

## Next 3–5 tasks
1. Stand up `programs/stonk_battles/` workspace (one Anchor program); port
   Counter + StopLoss into real game accounts (GameConfig, Match, Team, Basket,
   StopLoss, SpectatorBid, VillainPick, Proposal, RoundCounter).
2. Add VRF surface (`#[vrf]` + `#[vrf_callback]`) for villain token + chaos
   events, single `DEFAULT_EPHEMERAL_QUEUE`, idempotent callbacks.
3. Add governance (`propose_param_change` / `vote_on_proposal` / `tally_proposal`)
   keyed on FTR balance snapshot.
4. Compile-check + smoke-deliver against the deployed devnet program.
5. Set up `tests/spike_e2e.ts` for round-trip (init_match → lock_in → VRF villain →
   tick_price → VRF chaos → reveal → FTR mint → undelegate).

## Pointers
- Program ID (devnet): `2Prk1oV522ED8y5tsHXXxLYfBaPVYSHLEwRoXg3At979` — counter
  from Phase 0; new program ID lands here after Phase A deploy.
- ER FQDN: derived at runtime via router `getDelegationStatus`; observed
  `https://devnet-as.magicblock.app/` for current devnet ER.
- MagicBlock devnet RPC: `https://rpc.magicblock.app/devnet`
- Router: `https://devnet-router.magicblock.app/`
- Vercel preview: TBD — set in Phase B.
- Supabase project: TBD — set in Phase C.
- Helius webhook: TBD — set in Phase C.
- Plan file: docs/PLAN.md (read this for the full design).
- ADR for this outcome: docs/decisions/0001-spike-outcome.md.

## Known risks (carried forward)
- Skill snapshot has stale PER pubkeys/seeds (corrected in spike; re-verify
  imports on any SDK bump).
- Local `mb-stack` requires `RLIMIT_NOFILE=1_000_000`; this shell caps at 524288
  and can't raise. Verification stays on devnet for Phase A too unless we get
  the FD limit lifted.
- Wallet-adapter React types pull React 19 transitive deps; Phase B tsconfig
  may need to lock those.
- TEE-enforced PER membership is not exercised on devnet ER (non-TEE). Phase A
  StopLoss must add an application-level member check so TEE and non-TEE both
  reject non-permitted signers.

## Repo skeleton
```
conviction/
├── CLAUDE.md                # this file (≤300 lines)
├── docs/
│   ├── PLAN.md              # full plan (from breif.md planning session)
│   ├── CHANGELOG.md         # append-only phase log
│   └── decisions/           # one ADR per material choice
├── programs/
│   └── stonk_battles/       # one Anchor program (Phase A)
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
