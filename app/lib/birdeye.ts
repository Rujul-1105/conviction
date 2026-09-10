/**
 * Birdeye price feed (DESIGN.md §11).
 *
 * Used for the deployed build. The live round deliberately runs on mock prices
 * during the demo — they're more dramatic and, more importantly, controllable.
 *
 * The API key is read from NEXT_PUBLIC_BIRDEYE_API_KEY. That is a public
 * client-side key by design; Birdeye's public tier expects it. If we ever move
 * to a paid key it must move behind a route handler instead.
 */

const BIRDEYE_API = 'https://public-api.birdeye.so'

export type BirdeyePrice = {
  value: number
  priceChange24h?: number
}

/**
 * Fetch prices for up to ~100 mints in one call.
 * Returns a mint -> price map. Callers should treat a missing key as "stale",
 * never as zero — a zero price would render as a -100% position.
 */
export async function fetchBirdeyePrices(
  mints: string[],
): Promise<Record<string, number>> {
  if (mints.length === 0) return {}

  const headers: Record<string, string> = { 'x-chain': 'solana' }
  const key = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY
  if (key) headers['X-API-KEY'] = key

  const response = await fetch(
    `${BIRDEYE_API}/defi/multi_price?list_address=${mints.join(',')}`,
    { headers },
  )
  if (!response.ok) throw new Error(`Birdeye fetch failed: ${response.status}`)

  const json = (await response.json()) as {
    data?: Record<string, BirdeyePrice | null>
  }

  const out: Record<string, number> = {}
  for (const [mint, entry] of Object.entries(json.data ?? {})) {
    if (entry && typeof entry.value === 'number') out[mint] = entry.value
  }
  return out
}
