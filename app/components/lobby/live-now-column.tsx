'use client'

import Link from 'next/link'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num, Pnl, SolAmount } from '@/components/ui/num'
import { StatusPill, teamStatusVariant } from '@/components/ui/status-pill'
import { useLiveMatches } from '@/lib/hooks/use-matches'
import { TOP_VILLAGES } from '@/lib/api/mock-fixtures'
import { Ftr } from '@/components/ui/num'

/**
 * "Live now" column for the lobby (DESIGN.md §10 priority 3).
 *
 * Spectator-oriented, so it links to /spectate rather than /match — a player
 * can't join a round already in progress.
 */
export function LiveNowColumn() {
  const { data: matches } = useLiveMatches()

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <PanelLabel>Live now</PanelLabel>
        <StatusPill variant="holding" dot pulse>
          {matches?.length ?? 0}
        </StatusPill>
      </div>

      <div className="mt-4 space-y-2">
        {!matches?.length && (
          <p className="text-body-sm text-text-muted">No rounds in progress.</p>
        )}

        {matches?.map((match) => {
          const ranked = [...match.teams].sort((a, b) => b.pnl - a.pnl)
          return (
            <Link
              key={match.id}
              href={`/spectate/${match.id}`}
              className="block rounded-md border border-border p-3 transition-colors hover:bg-surface-elevated"
            >
              <div className="flex items-center justify-between gap-2">
                <PanelLabel>Round {match.roundNumber}</PanelLabel>
                <SolAmount value={match.pot} size="sm" />
              </div>

              <div className="mt-2 space-y-1">
                {ranked.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-body-sm text-paper">
                      {team.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pnl value={team.pnl} size="sm" />
                      <StatusPill variant={teamStatusVariant(team.status)}>
                        {team.status}
                      </StatusPill>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <Num size="sm" className="text-whisper">
                  {match.spectatorCount} watching
                </Num>
                {match.chaosEventCount > 0 && (
                  <Num size="sm" className="text-chaos">
                    {match.chaosEventCount}x chaos
                  </Num>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

/**
 * Top villages leaderboard, ranked by FTR.
 * Static mock data — there is no cross-match leaderboard account on chain, and
 * PHASE_B_BRIEF lists global history as an explicit anti-goal.
 */
export function TopVillages() {
  return (
    <Card className="p-4">
      <PanelLabel>Top villages</PanelLabel>
      <div className="mt-4 space-y-2">
        {TOP_VILLAGES.map((village, i) => (
          <div key={village.name} className="flex items-center gap-3">
            <Num size="sm" className="w-4 shrink-0 text-whisper">
              {i + 1}
            </Num>
            <span className="flex-1 truncate text-body-sm text-paper">
              {village.name}
            </span>
            <Num size="sm" className="shrink-0 text-text-muted">
              {(village.winRate * 100).toFixed(0)}%
            </Num>
            <Ftr value={village.ftr} size="sm" className="w-14 shrink-0 text-right" />
          </div>
        ))}
      </div>
    </Card>
  )
}
