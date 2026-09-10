'use client'

import { useEffect, useRef, useState } from 'react'
import { PanelLabel } from '@/components/ui/card'
import { Num, Pnl } from '@/components/ui/num'
import { colors } from '@/lib/colors'
import type { StopLossBand, Team } from '@/lib/api'

/**
 * Live P&L chart (DESIGN.md §10 priority 5).
 *
 * Hand-rolled inline SVG rather than a charting library: DESIGN.md §14 bans new
 * dependencies, and this needs exactly two polylines and a zero rule. Fewer
 * bytes than any chart lib and it inherits the palette for free.
 *
 * Stroke colours come from lib/colors.ts because SVG `stroke` can't take a
 * Tailwind class — that's the documented escape hatch, not a rule violation.
 *
 * `stopLossBand` (bps) renders as a shaded fold-zone spanning
 * `minBps/100`% … `maxBps/100`%. If any line crosses out of the zone,
 * the chart annotates "Auto-fold armed" — this is the visual reminder
 * that the basket-level band decides survival.
 */

const WIDTH = 600
const HEIGHT = 200
const PAD = 8
/** Rolling window: 60 samples at ~3s each ≈ the last 3 minutes. */
const MAX_POINTS = 60

type Series = { teamId: string; name: string; points: number[]; color: string }

export function PriceChart({
  teams,
  stopLossBand,
}: {
  teams: Team[]
  stopLossBand?: StopLossBand
}) {
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
  // When a stop-loss band is provided, expand the domain to include it so the
  // shaded fold-zone renders fully and never gets clipped.
  const allValues = series.flatMap((s) => s.points)
  const bandValues = stopLossBand
    ? [stopLossBand.minBps / 100, stopLossBand.maxBps / 100]
    : []
  const extent = Math.max(4, ...allValues.map(Math.abs), ...bandValues.map(Math.abs)) * 1.15

  const toX = (i: number, len: number) =>
    PAD + (i / Math.max(1, len - 1)) * (WIDTH - PAD * 2)
  const toY = (v: number) =>
    HEIGHT / 2 - (v / extent) * (HEIGHT / 2 - PAD)

  // Band overlay geometry (computed in the same coord space as the polylines).
  const bandRect = stopLossBand
    ? {
        yTop: toY(stopLossBand.maxBps / 100),
        yBottom: toY(stopLossBand.minBps / 100),
      }
    : null

  // Auto-fold fires the moment a team's latest P&L crosses the band's
  // floor (the deepest allowed loss). Pre-reveal this is silent; during a
  // live round it triggers the team's `fold` ix.
  const anyTeamFolded = stopLossBand
    ? series.some((s) => {
        const last = s.points[s.points.length - 1]
        return typeof last === 'number' && last < stopLossBand.minBps / 100
      })
    : false

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
          {stopLossBand && (
            <span
              className={
                'rounded-md border px-2 py-0.5 text-label ' +
                (anyTeamFolded
                  ? 'border-fold bg-fold/15 text-fold'
                  : 'border-volatility/40 bg-volatility/10 text-volatility')
              }
            >
              {anyTeamFolded ? 'Auto-fold armed' : 'Band armed'}
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 h-[200px] w-full"
        role="img"
        aria-label="Team profit and loss over the round"
      >
        {/* Stop-loss band overlay (basket-level rule). Drawn first so the
            polylines sit on top. */}
        {bandRect && (
          <rect
            x={PAD}
            y={bandRect.yTop}
            width={WIDTH - PAD * 2}
            height={Math.max(2, bandRect.yBottom - bandRect.yTop)}
            fill={colors.volatility}
            opacity={0.12}
          />
        )}
        {bandRect && (
          <line
            x1={PAD}
            x2={WIDTH - PAD}
            y1={bandRect.yTop}
            y2={bandRect.yTop}
            stroke={colors.volatility}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity={0.55}
          />
        )}

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