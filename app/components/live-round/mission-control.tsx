'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num, SolAmount } from '@/components/ui/num'
import { StatusPill } from '@/components/ui/status-pill'
import { ActionBar } from '@/components/live-round/action-bar'
import { EventFeed } from '@/components/live-round/event-feed'
import {
  LeaderboardColumn,
  StopLossStatus,
} from '@/components/live-round/leaderboard-column'
import { PriceChart } from '@/components/live-round/price-chart'
import { ChaosBanner, RoundTimer } from '@/components/live-round/round-timer'
import { PredictionPanel } from '@/components/spectate/prediction-panel'
import { usePnlHistory } from '@/components/live-round/use-pnl-history'
import { useCountdown } from '@/lib/hooks/use-countdown'
import { useRound } from '@/lib/hooks/use-round'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { cn } from '@/lib/utils'

/**
 * Mission Control — the shared live-round view.
 *
 * Used by BOTH /match/[id]/live and /spectate/[id]. DESIGN.md §10 priority 7
 * specifies the spectator screen as "same layout as live round but" with
 * actions removed, a prediction panel added, and a purple tint — so it is one
 * component with a `mode` switch rather than two near-identical screens that
 * would inevitably drift apart.
 *
 * Phase 8 polish:
 *  - Top strip is a strict 3-column grid (pot | countdown | meta). Below the
 *    strip a 1px border-b keeps the top section's separation honest.
 *  - Body grid is a fixed ratio at `lg:grid-cols-[300px_1fr_320px]`,
 *    widening slightly on `xl`. No react-resizable-panels (per the plan).
 *  - Spectator mode is signalled by a 4px volatility-purple left border, not
 *    a surface wash, so it reads as a structural flag rather than a tint.
 *  - P&L history is owned here and passed down to both PriceChart and
 *    LeaderboardColumn so the chart line and the leaderboard sparkline share
 *    the same rolling series.
 */
export function MissionControl({
  matchId,
  mode,
}: {
  matchId: string
  mode: 'player' | 'spectator'
}) {
  const { data, isLoading } = useRound(matchId)
  const { teamName } = useGameWallet()
  const isSpectator = mode === 'spectator'

  const match = data?.match
  const events = data?.events ?? []
  const { expired } = useCountdown(match?.endTime)

  // The player's own village, for the action bar and stop-loss panel.
  const myTeam = match?.teams.find((t) => t.name === teamName) ?? match?.teams[0]

  // P&L series is shared between PriceChart and LeaderboardColumn's Sparklines.
  // Hook is safe to call with an empty array (no seed work happens until teams
  // arrive), so we always invoke it to keep hook order stable across renders.
  const series = usePnlHistory(match?.teams ?? [])

  if (isLoading && !match) {
    return (
      <div className="py-16 text-center">
        <Num className="text-text-muted">Connecting to the rollup…</Num>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-lg text-paper">Round is no longer on the ledger.</p>
        <Link href="/lobby" className="mt-4 inline-block">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cn(
        // Spectator gets a 4px left border in volatility purple so the entire
        // surface reads as a different mode, not just a colour tweak.
        isSpectator ? 'border-l-4 border-l-volatility/30 pl-3' : 'py-0',
      )}
    >
      {/* Top strip: pot (left) · countdown (centre) · watching + chaos pills
          (right). Strict 3-col grid so the timer sits dead-centre on every
          viewport. The 1px border-b below separates the strip from the
          three-lane body. */}
      <div className="grid grid-cols-3 gap-4 border-b border-border pb-4">
        <div className="flex flex-col">
          <PanelLabel>Pot</PanelLabel>
          <SolAmount value={match.pot} size="xl" className="block" />
          <Num size="sm" className="text-whisper">
            {match.mode} · {match.tier}
          </Num>
        </div>

        <div className="flex justify-center">
          <RoundTimer
            endTime={match.endTime}
            roundNumber={match.roundNumber}
            status={match.status}
          />
        </div>

        <div className="flex flex-col items-end">
          <PanelLabel>Watching</PanelLabel>
          <Num size="xl" className="block text-paper">
            {match.spectatorCount}
          </Num>
          <div className="mt-1 flex flex-wrap justify-end gap-2">
            {isSpectator && (
              <StatusPill variant="spectating">Spectating</StatusPill>
            )}
            {match.chaosEventCount > 0 && (
              <StatusPill variant="chaos">
                {match.chaosEventCount}x chaos
              </StatusPill>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ChaosBanner />
      </div>

      {/* Three-lane mission control: standings | chart+actions | feed.
          Fixed ratio at lg, slightly wider columns at xl. No drag-to-resize
          — that'd be a tutorial moment, not a design moment. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr_320px] xl:grid-cols-[340px_1fr_360px]">
        <div className="space-y-4">
          <LeaderboardColumn
            teams={match.teams}
            highlightTeamId={myTeam?.id}
            series={series}
          />
          {!isSpectator && <StopLossStatus team={myTeam} />}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <PriceChart
              teams={match.teams}
              stopLossBand={myTeam?.basket?.band}
              series={series}
            />
          </Card>

          {isSpectator ? (
            <PredictionPanel matchId={matchId} teams={match.teams} />
          ) : expired || match.status === 'ended' ? (
            <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <PanelLabel>Round complete</PanelLabel>
                <p className="text-body-md text-paper">
                  Settling to Solana. Time to see the sealed picks.
                </p>
              </div>
              <Link href={`/reveal/${matchId}`}>
                <Button variant="primary" size="lg">
                  Go to reveal
                </Button>
              </Link>
            </Card>
          ) : (
            <ActionBar matchId={matchId} team={myTeam} />
          )}
        </div>

        <div className="min-h-[400px]">
          <EventFeed events={events} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
