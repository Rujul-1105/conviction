'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Match, type RoundEvent } from '@/lib/api'
import { useMatchStore } from '@/lib/store/match-store'

type RoundData = { match: Match; events: RoundEvent[] }

/**
 * Live round subscription (DESIGN.md §7).
 *
 * `realApi.subscribeToRound` subscribes via ER `onAccountChange` on Match +
 * Team×2 and writes fresh round state straight into `['round', matchId]`.
 * Events are pushed into the same cache so the feed re-renders without a
 * refetch round-trip. The only React Query mutation needed is the fold
 * invalidation on `['match', matchId]` so any consumer of `useMatch` (which
 * uses a separate cache key) picks up the team-status change. The
 * `['leaderboard', matchId]` cache was deleted with the `useLeaderboard`
 * hook in F-B3.
 */
export function useSubscribeRound(matchId: string) {
  const queryClient = useQueryClient()
  const showChaos = useMatchStore((s) => s.showChaos)

  useEffect(() => {
    if (!matchId) return

    const unsub = api.subscribeToRound(matchId, (event) => {
      queryClient.setQueryData<RoundData>(['round', matchId], (old) => {
        if (!old) return old
        // Cap the feed so a long-running demo can't grow unbounded.
        return { ...old, events: [event, ...old.events].slice(0, 60) }
      })

      // A fold changes team status (alive/folded). Refresh the separate
      // `['match', matchId]` cache that `useMatch` (a different key)
      // reads from, so any consumer outside `useRound` sees the update.
      if (event.type === 'fold' || event.type === 'round_end') {
        void queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      }

      // Chaos flashes a banner. The banner self-clears — never let it sit.
      if (event.type === 'chaos') showChaos(event.message)
    })

    return unsub
  }, [matchId, queryClient, showChaos])
}

/** Round data plus its live subscription. Screens use this, not the parts. */
export function useRound(matchId: string) {
  const query = useQuery({
    queryKey: ['round', matchId],
    queryFn: () => api.getRound(matchId),
    enabled: !!matchId,
  })
  useSubscribeRound(matchId)
  return query
}
