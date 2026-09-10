'use client'

import { Crown } from 'lucide-react'
import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, Num } from '@/components/ui/num'
import { TOP_VILLAGES } from '@/lib/api/mock-fixtures'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { cn } from '@/lib/utils'

/**
 * Village leaderboard.
 *
 * Present in DESIGN.md §2's route tree but with no §10 spec, so this is
 * intentionally minimal — PHASE_B_BRIEF lists global history as an anti-goal,
 * and there is no cross-match leaderboard account on chain to read from. Static
 * mock data ranked by FTR.
 */
export default function LeaderboardPage() {
  const { teamName } = useGameWallet()

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />

        <main className="min-w-0 flex-1 py-8">
          <h1 className="font-display text-heading-lg font-bold text-paper">
            Villages
          </h1>
          <p className="mt-1 text-body-md text-text-muted">
            Ranked by FTR earned across the season.
          </p>

          <Card className="mt-8 p-4">
            {/* Header row. Mono uppercase labels read as instrumentation. */}
            <div className="grid grid-cols-[2rem_1fr_5rem_6rem] items-center gap-3 border-b border-border pb-2">
              <PanelLabel>#</PanelLabel>
              <PanelLabel>Village</PanelLabel>
              <PanelLabel className="text-right">Win rate</PanelLabel>
              <PanelLabel className="text-right">FTR</PanelLabel>
            </div>

            <div className="mt-1">
              {TOP_VILLAGES.map((village, i) => {
                const isYou = village.name === teamName
                return (
                  <div
                    key={village.name}
                    className={cn(
                      'grid grid-cols-[2rem_1fr_5rem_6rem] items-center gap-3 border-b border-border/60 py-2.5 last:border-0',
                      isYou && '-mx-2 rounded-md bg-surface-elevated px-2',
                    )}
                  >
                    <div className="flex items-center">
                      {i === 0 ? (
                        <Crown className="h-4 w-4 text-conviction" />
                      ) : (
                        <Num size="sm" className="text-whisper">
                          {i + 1}
                        </Num>
                      )}
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-body-md text-paper">
                        {village.name}
                      </span>
                      {isYou && (
                        <span className="shrink-0 font-mono text-label uppercase text-whisper">
                          you
                        </span>
                      )}
                    </div>

                    <Num size="sm" className="text-right text-text-muted">
                      {(village.winRate * 100).toFixed(0)}%
                    </Num>

                    <Ftr value={village.ftr} className="text-right" />
                  </div>
                )
              })}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
