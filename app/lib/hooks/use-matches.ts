'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Match queries (DESIGN.md §7).
 *
 * Refetch intervals are deliberately different: the lobby's open list changes
 * on human timescales (5s) while live matches move constantly (3s). React
 * Query owns all server/on-chain state; Zustand never caches these.
 *
 * Note: `useLeaderboard` was deleted in the F-B3 fix (dead code — the live
 * screen sorted `match.teams` client-side in `leaderboard-column.tsx`, and
 * the 3s polling duplicated work that ER subscriptions now own).
 */

export function useOpenMatches() {
  return useQuery({
    queryKey: ['matches', 'open'],
    queryFn: () => api.getOpenMatches(),
    refetchInterval: 5000,
  })
}

export function useLiveMatches() {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: () => api.getLiveMatches(),
    refetchInterval: 3000,
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => api.getMatch(id),
    enabled: !!id,
  })
}
