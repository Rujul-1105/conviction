'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Match, type RoundEvent } from '@/lib/api'
import { useMatchStore } from '@/lib/store/match-store'

type RoundData = { match: Match; events: RoundEvent[] }

/**
 * Live round subscription (DESIGN.md §7).
 *
 * The mock fires every 3s; the real implementation will be an ER
 * onAccountChange subscription. Either way events are pushed straight into the
 * React Query cache so the feed re-renders without a refetch round-trip.
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

      // A fold changes standings, so pull fresh match + leaderboard state.
      if (event.type === 'fold' || event.type === 'round_end') {
        void queryClient.invalidateQueries({ queryKey: ['match', matchId] })
        void queryClient.invalidateQueries({ queryKey: ['leaderboard', matchId] })
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
