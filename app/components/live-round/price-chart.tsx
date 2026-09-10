'use client'

import { useEffect, useRef, useState } from 'react'
import { PanelLabel } from '@/components/ui/card'
import { Num, Pnl } from '@/components/ui/num'
import { colors } from '@/lib/colors'
import type { Team } from '@/lib/api'

/**
 * Live P&L chart (DESIGN.md §10 priority 5).
 *
 * Hand-rolled inline SVG rather than a charting library: DESIGN.md §14 bans new
 * dependencies, and this needs exactly two polylines and a zero rule. Fewer
 * bytes than any chart lib and it inherits the palette for free.
 *
 * Stroke colours come from lib/colors.ts because SVG `stroke` can't take a
 * Tailwind class — that's the documented escape hatch, not a rule violation.
 */

const WIDTH = 600
const HEIGHT = 200
const PAD = 8
/** Rolling window: 60 samples at ~3s each ≈ the last 3 minutes. */
const MAX_POINTS = 60

type Series = { teamId: string; name: string; points: number[]; color: string }

export function PriceChart({ teams }: { teams: Team[] }) {
  // History accumulates client-side. The program never stores price history
  // (tick_price persists nothing), so this is the only place it exists.
  const [series, setSeries] = useState<Series[]>([])
  const teamsRef = useRef(teams)
  teamsRef.current = teams

  useEffect(() => {
    const palette = [colors.conviction, colors.fold]

    /**
     * Seed a plausible walk that ends at each team's current P&L.
     *
     * Without this the chart is empty for the first 3s and needs ~30s before
     * it reads as a chart at all — unacceptable for the demo centerpiece.
     * The walk is generated backwards from the live value and converges toward
     * 0 at the start of the round, which is where every position actually began.
     */
    const seed = (pnl: number, n = 20): number[] => {
      const points: number[] = []
      for (let i = 0; i < n; i += 1) {
        const progress = i / (n - 1)
        const jitter = (Math.random() - 0.5) * Math.abs(pnl) * 0.35
        points.push(Number((pnl * progress + jitter * progress).toFixed(2)))
      }
      return points
    }

    setSeries(
      teamsRef.current.map((team, i) => ({
        teamId: team.id,
        name: team.name,
        points: seed(team.pnl),
        color: palette[i % palette.length],
      })),
    )

    const sample = () => {
      setSeries((prev) =>
        teamsRef.current.map((team, i) => {
          const existing = prev.find((s) => s.teamId === team.id)
          const points = [...(existing?.points ?? []), team.pnl].slice(-MAX_POINTS)
          return {
            teamId: team.id,
            name: team.name,
            points,
            color: palette[i % palette.length],
          }
        }),
      )
    }

    const id = setInterval(sample, 3000)
    return () => clearInterval(id)
  }, [])

  // Symmetric domain around zero so the midline is always the break-even line.
  const allValues = series.flatMap((s) => s.points)
  const extent = Math.max(4, ...allValues.map(Math.abs)) * 1.15

  const toX = (i: number, len: number) =>
    PAD + (i / Math.max(1, len - 1)) * (WIDTH - PAD * 2)
  const toY = (v: number) =>
    HEIGHT / 2 - (v / extent) * (HEIGHT / 2 - PAD)

  return (
    <div>
      {/* Header wraps as a unit: the label must not be squeezed into two lines
          by the legend, which is what happened when both were flex children. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <PanelLabel className="whitespace-nowrap">Position P&amp;L</PanelLabel>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <div key={s.teamId} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="max-w-[140px] truncate text-body-sm text-text-muted">
                {s.name}
              </span>
              <Pnl value={s.points[s.points.length - 1] ?? 0} size="sm" />
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 h-[200px] w-full"
        role="img"
        aria-label="Team profit and loss over the round"
      >
        {/* Break-even rule. Dashed so it reads as a reference, not data. */}
        <line
          x1={PAD}
          y1={HEIGHT / 2}
          x2={WIDTH - PAD}
          y2={HEIGHT / 2}
          stroke={colors.border}
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Quarter gridlines. */}
        {[0.25, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            y1={HEIGHT * f}
            x2={WIDTH - PAD}
            y2={HEIGHT * f}
            stroke={colors.border}
            strokeWidth="1"
            opacity="0.4"
          />
        ))}

        {series.map((s) => {
          if (s.points.length < 2) return null
          const d = s.points
            .map((v, i) => `${toX(i, s.points.length)},${toY(v)}`)
            .join(' ')
          return (
            <polyline
              key={s.teamId}
              points={d}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      <div className="flex justify-between">
        <Num size="sm" className="text-whisper">
          -{extent.toFixed(0)}%
        </Num>
        <Num size="sm" className="text-whisper">
          break even
        </Num>
        <Num size="sm" className="text-whisper">
          +{extent.toFixed(0)}%
        </Num>
      </div>
    </div>
  )
}
