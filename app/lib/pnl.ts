/**
 * Pure P&L math + per-wallet entry-price cache (DESIGN.md §11).
 *
 * `teamPnlPercent` derives a team's basket-weighted P&L from
 * `Match.last_prices_e6` (the latest observed per-slot price) vs. cached
 * entry prices (the price captured at the moment of lock-in). The formula
 * is intentionally pure — it takes its inputs as args so callers don't
 * need to thread React state.
 *
 * The `entryPriceCache` is in-memory, keyed by `(matchId, wallet)`. Two
 * windows watching the same match but with different wallets get distinct
 * entry prices (because lock-in may have happened at different slots). The
 * cache is intentionally NOT persisted to localStorage: a reconnect
 * mid-match must rebuild entry prices from the on-chain source, not from
 * a stale browser snapshot. LRU eviction at 50 entries keeps the cache
 * bounded across long demo sessions.
 *
 * Per-slot contributions are symmetric around zero — a 50% drop and a 50%
 * rise have opposite signs and equal magnitudes. The `e <= 0 || p <= 0`
 * guard treats a missing or zero price as "stale", contributing 0 rather
 * than falsely showing -100% or NaN. Forgetting the `* w` would have a
 * moonshot-only village look identical to a SOL-heavy village on the same
 * net move, so the weight is multiplied per slot before summing.
 */

import type { PublicKey } from '@solana/web3.js'

export type BasketEntry = { mint: string; entryPriceE6: number }

export type PnlInputs = {
  /** Per-slot weights in basis points. Sum to 10_000 across the three slots. */
  weightsBps: [number, number, number]
  /** Entry prices (e6-scaled) captured at lock-in, one per basket slot. */
  entries: [BasketEntry, BasketEntry, BasketEntry]
  /** Latest observed prices (e6-scaled), one per basket slot. */
  lastPricesE6: [number, number, number]
}

/**
 * Per-team weighted P&L as a percentage.
 *
 * Returns a number with up to 3 fractional digits so sub-1% moves are
 * visible on the leaderboard. Negative numbers indicate a loss; positive
 * indicates gain. A folded team isn't a meaningful input — the caller
 * should rank folded teams last regardless of the returned value.
 */
export function teamPnlPercent(args: PnlInputs): number {
  const { weightsBps, entries, lastPricesE6 } = args
  let sum = 0
  for (let i = 0; i < 3; i += 1) {
    const w = weightsBps[i] / 10_000
    const e = entries[i].entryPriceE6
    const p = lastPricesE6[i]
    // Stale price → contribute 0 rather than -100% / NaN. Slots the player
    // didn't pick are tracked as e === 0 (the basket PDA initialises them
    // to PublicKey.default, but the weight also goes to 0 in that slot).
    if (e <= 0 || p <= 0) continue
    sum += w * ((p - e) / e) * 100
  }
  return Number(sum.toFixed(3))
}

// ─── Per-wallet entry-price cache ──────────────────────────────────────────

type CacheEntry = {
  weightsBps: [number, number, number]
  entries: [BasketEntry, BasketEntry, BasketEntry]
  /** Unix-ms when this entry was first populated — for diagnostics. */
  recordedAt: number
}

const MAX_CACHE_ENTRIES = 50
const cache = new Map<string, CacheEntry>()

function cacheKey(matchId: string, wallet: PublicKey): string {
  return `${matchId}-${wallet.toBase58()}`
}

/**
 * Record a player's entry snapshot at lock-in time. The first write wins —
 * subsequent calls for the same key are ignored so a stray post-lock-in
 * tick can't retroactively change the entry price.
 */
export function recordEntryPrices(args: {
  matchId: string
  wallet: PublicKey
  weightsBps: [number, number, number]
  entries: [BasketEntry, BasketEntry, BasketEntry]
}): void {
  const key = cacheKey(args.matchId, args.wallet)
  if (cache.has(key)) return
  cache.set(key, {
    weightsBps: args.weightsBps,
    entries: args.entries,
    recordedAt: Date.now(),
  })
  // LRU-ish eviction: drop the oldest entry when we exceed the cap. A real
  // LRU would track access order; for a 50-entry demo cap, FIFO is fine.
  if (cache.size > MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
}

/**
 * Read a cached entry. Returns `null` when the player hasn't locked in for
 * this match yet — the caller should fall back to 0 (no P&L to compute).
 */
export function getEntryPrices(
  matchId: string,
  wallet: PublicKey,
): CacheEntry | null {
  return cache.get(cacheKey(matchId, wallet)) ?? null
}

/**
 * Forget the entry for a (match, wallet). Used by tests; no production
 * caller needs this today. Exported for completeness.
 */
export function clearEntryPrices(matchId: string, wallet: PublicKey): void {
  cache.delete(cacheKey(matchId, wallet))
}