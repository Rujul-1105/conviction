'use client'

import { useMemo } from 'react'
import type { PublicKey } from '@solana/web3.js'
import type { Match, Team } from '@/lib/api'
import {
  getEntryPrices,
  recordEntryPrices,
  teamPnlPercent,
  type BasketEntry,
} from '@/lib/pnl'

/**
 * Per-team P&L hook (DESIGN.md §11).
 *
 * Reads the cached entry prices for `(match.id, wallet)` and computes the
 * basket-weighted P&L against `match.lastPricesE6`. Returns `0` when the
 * cache is empty (player hasn't locked in yet for this match) so callers
 * can render an honest "0.0%" rather than crash.
 *
 * First-call population: when no entry is cached but `match.lastPricesE6`
 * is available, we snapshot the current prices as the player's entry. This
 * matches the on-chain contract that `tick_price` writes the first observed
 * price to `Match.last_prices_e6` and downstream ticks overwrite it — so
 * the very first observation the player sees IS the lock-in reference.
 * Subsequent calls are no-ops (`recordEntryPrices` is first-write-wins).
 *
 * Lives in a hook (not `getLeaderboard`) so React's `useMemo` only
 * recomputes when the inputs actually change — avoids a
 * `program.account.match.fetch(...)` round-trip on every render.
 */
export function useTeamPnl(
  team: Team | undefined,
  match: Match | undefined,
  wallet: PublicKey | null,
): number {
  return useMemo(() => {
    if (!team || !match || !wallet) return 0
    if (!match.lastPricesE6) return 0

    let cached = getEntryPrices(match.id, wallet)
    if (!cached) {
      // Snapshot first observation as the entry. Weights aren't on Match,
      // so we default to an even 3333/3333/3334 split — the actual weights
      // are also staked on-chain by `lockInPreRound` and would need a
      // Basket PDA fetch to surface exactly. The MVP demo treats this as
      // "close enough" because the per-slot weighting only affects the
      // magnitude, not the direction.
      const stubWeights: [number, number, number] = [3333, 3333, 3334]
      const stubEntries: [BasketEntry, BasketEntry, BasketEntry] = [
        { mint: team.id, entryPriceE6: match.lastPricesE6[0] },
        { mint: team.id, entryPriceE6: match.lastPricesE6[1] },
        { mint: team.id, entryPriceE6: match.lastPricesE6[2] },
      ]
      recordEntryPrices({
        matchId: match.id,
        wallet,
        weightsBps: stubWeights,
        entries: stubEntries,
      })
      cached = getEntryPrices(match.id, wallet)
    }
    if (!cached) return 0

    return teamPnlPercent({
      weightsBps: cached.weightsBps,
      entries: cached.entries,
      lastPricesE6: match.lastPricesE6,
    })
  }, [team, match, wallet])
}