'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Match queries (DESIGN.md §7).
 *
 * Refetch intervals are deliberately different: the lobby's open list changes
 * on human timescales (5s) while live matches move constantly (3s). React
 * Query owns all server/on-chain state; Zustand never caches these.
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

export function useLeaderboard(matchId: string) {
  return useQuery({
    queryKey: ['leaderboard', matchId],
    queryFn: () => api.getLeaderboard(matchId),
    enabled: !!matchId,
    refetchInterval: 3000,
  })
}
