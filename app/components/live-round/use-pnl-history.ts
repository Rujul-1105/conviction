'use client'

import { useEffect, useRef, useState } from 'react'
import { colors } from '@/lib/colors'
import type { Team } from '@/lib/api'

/**
 * Shared P&L history hook for live round components.
 *
 * The on-chain program never persists price history, so this is the only
 * place a rolling series exists. We seed a plausible walk that ends at each
 * team's current P&L, then append the team's `pnl` every 3s while the
 * component is mounted.
 *
 * Phase 8 polish: lifted out of PriceChart so LeaderboardColumn can render
 * a per-row Sparkline from the same source. Two consumers, one owner.
 *
 * No new deps. The seed is deterministic-by-seed would be nicer, but a
 * tiny random walk reads more like a live demo than a perfect ramp.
 */
export type PnlPoint = { teamId: string; color: string; points: number[] }

const MAX_POINTS = 60

/** Build an n-point walk that lands at `target` P&L. */
function seedWalk(target: number, n = 20): number[] {
  const pts: number[] = []
  for (let i = 0; i < n; i += 1) {
    const progress = i / (n - 1)
    const jitter = (Math.random() - 0.5) * Math.abs(target) * 0.35
    pts.push(Number((target * progress + jitter * progress).toFixed(2)))
  }
  return pts
}

export function usePnlHistory(teams: Team[]): PnlPoint[] {
  // Two-tone palette by team index — matches PriceChart. Fold wins on tie so
  // the spectator never confuses the two colours mid-round.
  const palette = [colors.conviction, colors.fold]

  const [series, setSeries] = useState<PnlPoint[]>([])
  const teamsRef = useRef(teams)
  teamsRef.current = teams

  useEffect(() => {
    setSeries(
      teamsRef.current.map((team, i) => ({
        teamId: team.id,
        color: palette[i % palette.length],
        points: seedWalk(team.pnl),
      })),
    )

    const sample = () => {
      setSeries((prev) =>
        teamsRef.current.map((team, i) => {
          const existing = prev.find((s) => s.teamId === team.id)
          const points = [...(existing?.points ?? []), team.pnl].slice(-MAX_POINTS)
          return {
            teamId: team.id,
            color: palette[i % palette.length],
            points,
          }
        }),
      )
    }

    const id = setInterval(sample, 3000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return series
}
