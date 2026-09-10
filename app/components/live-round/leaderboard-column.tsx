'use client'

import { Card, PanelLabel } from '@/components/ui/card'
import { Num, Pnl, Price } from '@/components/ui/num'
import { StatusPill, teamStatusVariant } from '@/components/ui/status-pill'
import type { Team } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Leaderboard column (DESIGN.md §10 priority 5).
 *
 * Ranked by P&L with folded villages sunk to the bottom — a folded team can't
 * win regardless of where its number landed, so ranking it above a holding
 * team would misrepresent the standings.
 */
export function LeaderboardColumn({
  teams,
  highlightTeamId,
}: {
  teams: Team[]
  highlightTeamId?: string
}) {
  const ranked = [...teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })

  return (
    <Card className="p-4">
      <PanelLabel>Standings</PanelLabel>

      <div className="mt-3 space-y-2">
        {ranked.map((team, i) => {
          const isYou = team.id === highlightTeamId
          const worst = team.worstPerformerMint
            ? tokenByMint(team.worstPerformerMint)
            : undefined

          return (
            <div
              key={team.id}
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
                  <span className="truncate text-body-md text-paper">
                    {team.name}
                  </span>
                  {isYou && (
                    <span className="shrink-0 font-mono text-label uppercase text-whisper">
                      you
                    </span>
                  )}
                </div>
                <Pnl value={team.pnl} size="lg" />
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
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/**
 * Stop-loss band status for the player's own village.
 * Amber/fold styling because it's an armed trigger, not a neutral readout.
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
            <Num size="sm" className="text-fold">
              {minPct.toFixed(1)}% … {maxPct.toFixed(1)}%
            </Num>
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
