'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num, Pnl, Price } from '@/components/ui/num'
import { StatusPill, teamStatusVariant } from '@/components/ui/status-pill'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sparkline } from '@/components/ui/sparkline'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatPct } from '@/lib/utils'
import type { Team } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { cn, timeAgo } from '@/lib/utils'
import type { PnlPoint } from '@/components/live-round/use-pnl-history'

/**
 * Leaderboard column (DESIGN.md §10 priority 5).
 *
 * Ranked by P&L with folded villages sunk to the bottom — a folded team can't
 * win regardless of where its number landed, so ranking it above a holding
 * team would misrepresent the standings.
 *
 * Phase 8 polish:
 *  - motion.div layout + layoutId per row → rank swaps FLIP-animate instead
 *    of snapping (DESIGN.md §9). Folded teams keep their opacity-60 fade.
 *  - shadcn Avatar for each team; fallback renders the first letter of the
 *    team name in mono uppercase.
 *  - Per-row Sparkline (last 30 P&L points) in conviction/fold colour.
 *  - Wrapped in shadcn ScrollArea with 8px scrollbar.
 */
export function LeaderboardColumn({
  teams,
  highlightTeamId,
  series = [],
}: {
  teams: Team[]
  highlightTeamId?: string
  series?: PnlPoint[]
}) {
  const reduced = useReducedMotion()
  const ranked = [...teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })

  return (
    <Card className="flex flex-col p-4">
      <PanelLabel>Standings</PanelLabel>

      <ScrollArea className="mt-3 h-[calc(100vh-22rem)] min-h-[280px] pr-3">
        <motion.div initial={false} className="space-y-2">
          {ranked.map((team, i) => {
            const isYou = team.id === highlightTeamId
            const worst = team.worstPerformerMint
              ? tokenByMint(team.worstPerformerMint)
              : undefined
            const teamSeries = series.find((s) => s.teamId === team.id)
            // Last 30 points feed the Sparkline. Slice is cheap; mock data is
            // already capped at MAX_POINTS=60 upstream.
            const last30Pnl = teamSeries?.points.slice(-30) ?? []
            const tone =
              team.pnl > 0 ? 'conviction' : team.pnl < 0 ? 'fold' : 'hold'

            return (
              <motion.div
                key={team.id}
                layout
                layoutId={`leaderboard-${team.id}`}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 32 }
                }
                className={cn(
                  'rounded-md border p-3',
                  isYou ? 'border-paper/30 bg-surface-elevated' : 'border-border',
                  team.status === 'folded' && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Num size="sm" className="text-whisper">
                      {i + 1}
                    </Num>
                    <Avatar className="h-7 w-7 bg-surface">
                      <AvatarFallback className="bg-surface font-mono text-[11px] text-paper">
                        {team.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-body-md text-paper">
                      {team.name}
                    </span>
                    {isYou && (
                      <span className="shrink-0 font-mono text-label uppercase text-whisper">
                        you
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pnl value={team.pnl} size="lg" />
                    <Sparkline values={last30Pnl} tone={tone} width={48} height={16} />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill variant={teamStatusVariant(team.status)}>
                    {team.status}
                  </StatusPill>

                  {team.foldTime && (
                    <Num size="sm" className="text-whisper">
                      folded {timeAgo(team.foldTime)}
                    </Num>
                  )}

                  {worst && team.status !== 'folded' && (
                    <Num size="sm" className="text-fold">
                      {worst.symbol} dragging
                    </Num>
                  )}
                </div>

                {/* Basket positions. Hidden pre-reveal for rival villages in the
                    real implementation — here the mock exposes them for the demo. */}
                {team.basket && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {team.basket.tokens.map((token) => (
                      <span key={token.mint} className="flex items-center gap-1">
                        <Num size="sm" className="text-text-muted">
                          {token.symbol}
                        </Num>
                        <Price value={token.currentPrice} size="sm" />
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </ScrollArea>
    </Card>
  )
}

/**
 * Stop-loss band status for the player's own village.
 * Amber/fold styling because it's an armed trigger, not a neutral readout.
 *
 * Phase 8 polish: the stop-loss value is wrapped in a Tooltip showing the
 * exact trigger percentage, since `minPct` is a band edge — operators want
 * the precise figure they wired.
 */
export function StopLossStatus({ team }: { team: Team | undefined }) {
  const band = team?.basket?.band
  if (!band) return null

  const pnl = team?.pnl ?? 0
  const minPct = band.minBps / 100
  const maxPct = band.maxBps / 100
  const headroom = pnl - minPct
  const triggered = pnl < minPct
  const close = !triggered && headroom <= 3

  return (
    <Card className="p-4">
      <PanelLabel>Your basket band</PanelLabel>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="text-body-sm text-paper">Auto-fold at</span>
          <div className="flex items-center gap-3">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Num size="sm" className="font-mono tabular-nums text-fold">
                    {minPct.toFixed(1)}% … {maxPct.toFixed(1)}%
                  </Num>
                </TooltipTrigger>
                <TooltipContent>
                  Trigger: {formatPct(minPct)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Num
              size="sm"
              className={triggered || close ? 'text-fold' : 'text-text-muted'}
            >
              {triggered
                ? 'triggered'
                : `${headroom.toFixed(1)}% to floor`}
            </Num>
          </div>
        </div>
      </div>
    </Card>
  )
}
