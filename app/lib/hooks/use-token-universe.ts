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
 * NOT used by the live round during the demo — that runs on mock prices, which
 * are more dramatic and controllable. This is for the deployed build.
 *
 * `retry: false` because a failed price fetch should surface as stale data
 * immediately rather than retrying behind a spinner; PLAN.md is explicit that
 * Mission Control shows the last known price with a stale indicator.
 */
export function useBirdeyePrices(mints: string[]) {
  return useQuery({
    queryKey: ['prices', [...mints].sort().join(',')],
    queryFn: () => fetchBirdeyePrices(mints),
    refetchInterval: 5000,
    enabled: mints.length > 0,
    retry: false,
  })
}
