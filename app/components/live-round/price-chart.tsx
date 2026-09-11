'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { PanelLabel } from '@/components/ui/card'
import { Num, Pnl } from '@/components/ui/num'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { colors } from '@/lib/colors'
import type { StopLossBand, Team } from '@/lib/api'
import { useBirdeyePrices } from '@/lib/hooks/use-token-universe'
import { usePnlHistory, type PnlPoint } from '@/components/live-round/use-pnl-history'

/**
 * Live P&L chart (DESIGN.md §10 priority 5).
 *
 * Hand-rolled inline SVG rather than a charting library: DESIGN.md §14 bans new
 * dependencies, and this needs exactly two polylines, a stop-loss band, an
 * entry marker, and a hover crosshair. Fewer bytes than any chart lib and it
 * inherits the palette for free.
 *
 * Stroke colours come from lib/colors.ts because SVG `stroke` can't take a
 * Tailwind class — that's the documented escape hatch, not a rule violation.
 *
 * Phase 8 polish:
 *  - Entry P&L marker: hollow circle at the chart's left edge for each team,
 *    so the line reads as a trajectory from "where they locked in".
 *  - Hover crosshair: vertical guide + y-axis value tooltip via shadcn
 *    Tooltip, controlled by mouse position.
 *  - Scale legend: bottom-right mono min/max read-out.
 *  - History is now owned by `usePnlHistory` so LeaderboardColumn can render
 *    a per-row Sparkline from the same rolling series.
 *
 * `stopLossBand` (bps) renders as a shaded fold-zone spanning
 * `minBps/100`% … `maxBps/100`%. If any line crosses out of the zone, the
 * chart annotates "Auto-fold armed" — this is the visual reminder that the
 * basket-level band decides survival.
 */

const WIDTH = 600
const HEIGHT = 200
const PAD = 8

type Props = {
  teams: Team[]
  stopLossBand?: StopLossBand
  /** Pre-computed rolling series from usePnlHistory. Falls back to local
   *  sampling if omitted, so the chart keeps working even when nothing has
   *  lifted the state yet. */
  series?: PnlPoint[]
}

export function PriceChart({ teams, stopLossBand, series: externalSeries }: Props) {
  const localSeries = usePnlHistory(teams)
  const series = externalSeries ?? localSeries
  const teamsRef = useRef(teams)
  teamsRef.current = teams

  // ── Birdeye wiring ─────────────────────────────────────────────────────────
  // Collect every mint across all team baskets into a de-duplicated list,
  // then poll prices at 10s. P&L is derived from basket entry vs. live price.
  const allMints = Array.from(
    new Set(teams.flatMap((t) => t.basket?.tokens.map((tk) => tk.mint) ?? [])),
  )
  const birdeye = useBirdeyePrices(allMints)
  const birdeyeError = birdeye.error as Error | null
  const hasBirdeyeKey = Boolean(
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_BIRDEYE_API_KEY
      : undefined,
  )
  const [birdeyeActive, setBirdeyeActive] = useState(false)

  useEffect(() => {
    if (birdeyeError) {
      setBirdeyeActive(false)
      toast.warning('Birdeye price feed unavailable', {
        description:
          'Chart is showing seeded mock data. Set NEXT_PUBLIC_BIRDEYE_API_KEY in .env.local.',
        id: 'birdeye-fallback',
      })
    } else if (birdeye.data && Object.keys(birdeye.data).length > 0) {
      setBirdeyeActive(hasBirdeyeKey)
    }
  }, [birdeyeError, birdeye.data, hasBirdeyeKey])

  // ── Geometry ───────────────────────────────────────────────────────────────
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

  // ── Hover crosshair ────────────────────────────────────────────────────────
  // Track mouseX across the chart so the tooltip can show the y-value at
  // the cursor. The tooltip itself is a shadcn Tooltip whose open state is
  // driven by JS, not the trigger's hover — Radix's default hover doesn't
  // position over SVG cleanly, so we go controlled.
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; value: number } | null>(
    null,
  )

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const ratio = WIDTH / rect.width
    const xPx = (e.clientX - rect.left) * ratio
    if (xPx < PAD || xPx > WIDTH - PAD) {
      setHover(null)
      return
    }
    const refPoints = series[0]?.points ?? []
    if (refPoints.length < 2) {
      setHover(null)
      return
    }
    const idx = Math.round(
      ((xPx - PAD) / (WIDTH - PAD * 2)) * (refPoints.length - 1),
    )
    const value = refPoints[Math.max(0, Math.min(refPoints.length - 1, idx))] ?? 0
    setHover({ x: xPx, y: toY(value), value })
  }

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
    <TooltipProvider delayDuration={50}>
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
                  {teams.find((t) => t.id === s.teamId)?.name ?? s.teamId}
                </span>
                <Pnl
                  value={s.points[s.points.length - 1] ?? 0}
                  size="sm"
                />
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
            <span
              className={
                'rounded-md border px-2 py-0.5 text-label ' +
                (birdeyeActive
                  ? 'border-conviction/30 bg-conviction/10 text-conviction'
                  : 'border-border bg-surface text-whisper')
              }
            >
              {birdeyeActive ? 'Birdeye live' : 'Mock walk'}
            </span>
          </div>
        </div>

        {/* The chart surface. Wrapped in a controlled Tooltip so the y-value
            read-out follows the cursor. TooltipTrigger is a div covering the
            SVG so we get Radix's collision avoidance for free. */}
        <Tooltip open={hover !== null}>
          <TooltipTrigger asChild>
            <div className="relative mt-3">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-[200px] w-full cursor-crosshair"
                role="img"
                aria-label="Team profit and loss over the round"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHover(null)}
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

                {/* Entry P&L marker per team — hollow circle at the chart's left
                    edge so each team's line reads as a trajectory from "where
                    they locked in". r=2 keeps it a glyph, not a blob. */}
                {series.map((s) => {
                  const team = teams.find((t) => t.id === s.teamId)
                  const value = team?.pnl ?? 0
                  return (
                    <circle
                      key={`entry-${s.teamId}`}
                      cx={PAD}
                      cy={toY(value)}
                      r={2}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={1}
                    />
                  )
                })}

                {/* Hover crosshair. Drawn last so it always sits on top. */}
                {hover && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.08 }}
                    x1={hover.x}
                    x2={hover.x}
                    y1={PAD}
                    y2={HEIGHT - PAD}
                    stroke={colors.border}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </svg>
            </div>
          </TooltipTrigger>
          {/* The tooltip content is the y-axis value at the cursor. It floats
              beside the cursor via the side="top" default. */}
          {hover && (
            <TooltipContent side="top" className="font-mono text-[11px] tabular-nums">
              {hover.value > 0 ? '+' : ''}
              {hover.value.toFixed(2)}%
            </TooltipContent>
          )}
        </Tooltip>

        {/* Scale legend: left reads the negative extreme, centre confirms
            break-even, right reads the positive extreme. Min/max in mono so
            digits don't shift as the domain widens. */}
        <div className="mt-1 flex justify-between font-mono text-[10px] text-whisper tabular-nums">
          <span>-{extent.toFixed(0)}%</span>
          <span>break even</span>
          <span>+{extent.toFixed(0)}%</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
