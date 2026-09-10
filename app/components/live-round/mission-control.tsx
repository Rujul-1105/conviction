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
        <p className="text-body-lg text-paper">Match not found.</p>
        <Link href="/lobby" className="mt-4 inline-block">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </div>
    )
  }

  return (
    // Spectator gets a 5% volatility-purple wash over the whole surface.
    <div className={cn('py-6', isSpectator && 'bg-volatility/[0.05]')}>
      {/* Top strip: timer centred, pot and meta flanking it. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PanelLabel>Pot</PanelLabel>
          <SolAmount value={match.pot} size="xl" className="block" />
          <Num size="sm" className="text-whisper">
            {match.mode} · {match.tier}
          </Num>
        </div>

        <RoundTimer
          endTime={match.endTime}
          roundNumber={match.roundNumber}
          status={match.status}
        />

        <div className="text-right">
          <PanelLabel>Watching</PanelLabel>
          <Num size="xl" className="block text-paper">
            {match.spectatorCount}
          </Num>
          <div className="mt-1 flex justify-end gap-2">
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

      {/* Three-lane mission control: standings | chart+actions | feed. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr_320px]">
        <div className="space-y-4">
          <LeaderboardColumn teams={match.teams} highlightTeamId={myTeam?.id} />
          {!isSpectator && <StopLossStatus team={myTeam} />}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <PriceChart teams={match.teams} />
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

        <div className="min-h-[400px] lg:h-[calc(100vh-13rem)]">
          <EventFeed events={events} />
        </div>
      </div>
    </div>
  )
}
