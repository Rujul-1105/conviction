# Changelog — Stonk Battles (Path A)

Append-only phase log. Phase starts get a one-line entry; phase ends get a block
listing what shipped, what's known-bad, and ADR pointers. Newest entries first.

---

- [Phase 0 end] 2026-09-06 — spike PASSED on MagicBlock devnet. Counter program deployed (`2Prk1oV522ED8y5tsHXXxLYfBaPVYSHLEwRoXg3At979`). ER + commit + undelegate + PER CPIs (create/update/close) all verified; ownership invariant holds (program ↔ delegation program ↔ program). **Local `mb-stack` was abandoned** — `ephemeral-validator` requires `RLIMIT_NOFILE=1_000_000`, this shell caps at 524288 and `sudo` is unavailable. Skill snapshot had stale PER pubkeys + seed (now corrected in spike/lib/permissioned.ts and per_smoke.mjs). Pause gate open — awaiting user confirmation before Phase A.
- [Phase 0 start] 2026-09-06 — Critical ER/PER spike: counter program (delegate/commit/undelegate) + PER permission lifecycle + mb-stack verification. Exit gate: 4 spike scenarios pass and ADR 0001 written.

## Phase 0 artifacts

```
spike/program/programs/counter/   Counter program (Anchor + #[ephemeral] + PER)
spike/program/target/idl/         Generated IDL
spike/app/app/                    Next.js 14 counter page (wallet-adapter)
spike/app/app/lib/magicblock.ts   dual-connection factory + router helper
spike/app/app/lib/permissioned.ts PER wrappers
spike/app/app/lib/idl.json        Loaded at runtime by idl.ts
spike/app/scripts/smoke.mjs       Counter lifecycle (devnet)
spike/app/scripts/per_smoke.mjs   StopLoss PER lifecycle (devnet)
spike/app/idl.json                (duplicate; used by smoke scripts)
docs/decisions/0001-spike-outcome.md
```
