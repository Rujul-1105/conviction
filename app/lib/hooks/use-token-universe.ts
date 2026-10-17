'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fetchBirdeyePrices } from '@/lib/birdeye'

/** Token universe. Static in practice, so it never needs refetching. */
export function useTokenUniverse() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.getTokenUniverse(),
    staleTime: Infinity,
  })
}

/** VRF-selected villain token. Null until the round reveals. */
export function useVillainToken(matchId: string) {
  return useQuery({
    queryKey: ['villain', matchId],
    queryFn: () => api.getVillainToken(matchId),
    enabled: !!matchId,
  })
}

/**
 * Live prices from Birdeye (DESIGN.md §7).
 *
 * Used by the deployed build's live-round chart. When the key is missing
 * or Birdeye 401s, the chart flips its pill to "Stale — Birdeye
 * unavailable" via the `birdeye.error` path — see `price-chart.tsx`.
 *
 * `retry: 1` (was `false` before F-B5) so a single transient 5xx is
 * forgiven before the pill flips; persistent failures still surface
 * immediately. PLAN.md is explicit that Mission Control shows the last
 * known price with a stale indicator — `price-chart.tsx` renders the
 * 4-state pill matrix against `birdeye.data`, `birdeye.error`, and the
 * on-chain tick age.
 */
export function useBirdeyePrices(mints: string[]) {
  return useQuery({
    queryKey: ['prices', [...mints].sort().join(',')],
    queryFn: () => fetchBirdeyePrices(mints),
    refetchInterval: 10_000,
    staleTime: 5_000,
    enabled: mints.length > 0,
    retry: 1,
  })
}
