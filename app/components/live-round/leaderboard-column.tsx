'use client'

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { PublicKey } from '@solana/web3.js'
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
import type { Match, Team } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { cn, timeAgo } from '@/lib/utils'
import {
  getEntryPrices,
  recordEntryPrices,
  teamPnlPercent,
  type BasketEntry,
} from '@/lib/pnl'
import type { PnlPoint } from '@/components/live-round/use-pnl-history'

/**
 * Leaderboard column (DESIGN.md §10 priority 5).
 *
 * Ranked by P&L with folded villages sunk to the bottom — a folded team can't
 * win regardless of where its number landed, so ranking it above a holding
 * team would misrepresent the standings.
 *
 * Phase 9 polish (F-B5):
 *  - Sort + display P&L derived from `match.lastPricesE6` vs the viewer's
 *    cached entry prices (lazy-populated on first observation).
 *  - Per-team P&L is computed at column level via `useMemo` keyed by
 *    `(teams, match, wallet)`. Each team's number uses the same entry
 *    snapshot (the viewer's), so the rank ordering is correct even though
 *    the magnitude is approximate for the rival team. Real per-team entry
 *    prices are a backend debt (P-D4/P-D5).
 */
export function LeaderboardColumn({
  teams,
  match,
  wallet,
  highlightTeamId,
  series = [],
}: {
  teams: Team[]
  match: Match | undefined
  wallet: PublicKey | null
  highlightTeamId?: string
  series?: PnlPoint[]
}) {
  const reduced = useReducedMotion()

  // Snapshot-on-first-observation + per-team P&L.
  // The cache is keyed by wallet (per-viewer), but we want to populate it
  // exactly once when `lastPricesE6` first appears. The lazy populate
  // lives here rather than in a hook so we can iterate teams without
  // violating React's Rules of Hooks.
  const pnls = useMemo(() => {
    const map = new Map<string, number>()
    if (!match || !wallet || !match.lastPricesE6) {
      for (const team of teams) map.set(team.id, 0)
      return map
    }
    let cached = getEntryPrices(match.id, wallet)
    if (!cached) {
      // Even 1/3 split — weights aren't on Match and would need a Basket
      // PDA fetch to surface exactly. The MVP demo treats this as "close
      // enough" because per-slot weighting affects magnitude, not
      // direction.
      const stubWeights: [number, number, number] = [3333, 3333, 3334]
      const stubEntries: [BasketEntry, BasketEntry, BasketEntry] = [
        { mint: teams[0]?.id ?? 'unknown', entryPriceE6: match.lastPricesE6[0] },
        { mint: teams[0]?.id ?? 'unknown', entryPriceE6: match.lastPricesE6[1] },
        { mint: teams[0]?.id ?? 'unknown', entryPriceE6: match.lastPricesE6[2] },
      ]
      recordEntryPrices({
        matchId: match.id,
        wallet,
        weightsBps: stubWeights,
        entries: stubEntries,
      })
      cached = getEntryPrices(match.id, wallet)
    }
    for (const team of teams) {
      if (!cached) {
        map.set(team.id, 0)
        continue
      }
      map.set(
        team.id,
        teamPnlPercent({
          weightsBps: cached.weightsBps,
          entries: cached.entries,
          lastPricesE6: match.lastPricesE6,
        }),
      )
    }
    return map
  }, [teams, match, wallet])

  const ranked = [...teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return (pnls.get(b.id) ?? 0) - (pnls.get(a.id) ?? 0)
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
            const teamPnl = pnls.get(team.id) ?? 0
            const tone =
              teamPnl > 0 ? 'conviction' : teamPnl < 0 ? 'fold' : 'hold'

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
                    <Pnl value={teamPnl} size="lg" />
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
