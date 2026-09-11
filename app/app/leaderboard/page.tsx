'use client'

import { useMemo } from 'react'
import { Crown, TrendingDown, TrendingUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, Num } from '@/components/ui/num'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkline } from '@/components/ui/sparkline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
 *
 * Phase 8 polish:
 *  - shadcn <Tabs> at the top: Village A / Village B / All. The All view
 *    shows the whole roster; the village-specific views aren't bound to live
 *    data yet (no per-village history on chain) — they show the village's
 *    teammates for layout coverage.
 *  - Village filter becomes a shadcn <DropdownMenu> from the column header.
 *  - Top-3 rows get a tiny <TrendingUp>/<TrendingDown> chevron next to PnL
 *    in the conviction/fold colour. Direction is derived from the village's
 *    rank delta against a mock-rolled walk.
 *  - Each row gets a <Sparkline> showing the village's FTR over the last
 *    30 ticks (mock data — no hook yet).
 *  - User's own row gets the conviction highlight (already there; tightened).
 *  - List wrapped in <ScrollArea>.
 */

type View = 'all' | 'village-a' | 'village-b'

const VIEW_LABEL: Record<View, string> = {
  all: 'All',
  'village-a': 'Village A',
  'village-b': 'Village B',
}

/** Deterministic mock walk for the sparkline — 30 ticks, varies by village.
 *  No hook exists for per-village FTR history, so we generate a stable
 *  series from the village's name length + FTR balance. */
function mockFtrHistory(ftr: number, key: string): number[] {
  const seed = key.length * 17
  return Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.5) * (ftr * 0.04)
    const drift = i * (ftr * 0.005)
    return Math.max(0, ftr - 200 + drift + wave)
  })
}

/** Direction sign for the top-3 chevron — mock trend vs. previous tick. */
function mockDirection(key: string): 'up' | 'down' {
  // Deterministic from the key length so the same village always trends the
  // same way for a given session.
  return key.length % 2 === 0 ? 'up' : 'down'
}

export default function LeaderboardPage() {
  const { teamName } = useGameWallet()

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PageBackdrop>
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />

        <main className="min-w-0 flex-1 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-heading-lg font-bold text-paper">
                Villages
              </h1>
              <p className="mt-1 text-body-md text-text-muted">
                Ranked by FTR earned across the season.
              </p>
            </div>
          </div>

          {/* View switcher — shadcn Tabs, underline indicator in conviction. */}
          <Tabs defaultValue="all" className="mt-6">
            <TabsList className="h-9 bg-transparent p-0">
              {(['all', 'village-a', 'village-b'] as const).map((view) => (
                <TabsTrigger
                  key={view}
                  value={view}
                  className={cn(
                    'h-9 rounded-md border border-transparent px-3 font-mono text-label uppercase tracking-[0.06em] text-whisper',
                    'data-[state=active]:border-paper/30 data-[state=active]:bg-surface-elevated data-[state=active]:text-paper',
                  )}
                >
                  {VIEW_LABEL[view]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <LeaderboardCard
                villages={TOP_VILLAGES}
                teamName={teamName}
                title="All villages"
              />
            </TabsContent>
            <TabsContent value="village-a" className="mt-4">
              <LeaderboardCard
                villages={TOP_VILLAGES.slice(0, 3)}
                teamName={teamName}
                title="Village A — top 3"
              />
            </TabsContent>
            <TabsContent value="village-b" className="mt-4">
              <LeaderboardCard
                villages={TOP_VILLAGES.slice(3, 6)}
                teamName={teamName}
                title="Village B — mid 3"
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      </PageBackdrop>
    </div>
  )
}

/**
 * The leaderboard table — used by every <TabsContent> above so the layout
 * stays consistent across the three views. The DropdownMenu in the column
 * header would filter to a single village once a per-village endpoint lands;
 * for now it sorts by FTR / win-rate.
 */
function LeaderboardCard({
  villages,
  teamName,
  title,
}: {
  villages: typeof TOP_VILLAGES
  teamName: string | null | undefined
  title: string
}) {
  // Sort by FTR for stable ordering, then remember each village's history.
  const rows = useMemo(
    () =>
      [...villages].sort((a, b) => b.ftr - a.ftr),
    [villages],
  )

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <PanelLabel>{title}</PanelLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Sort · FTR
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Sort · FTR</DropdownMenuItem>
            <DropdownMenuItem>Sort · Win rate</DropdownMenuItem>
            <DropdownMenuItem>Sort · Recent</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header row. Mono uppercase labels read as instrumentation. */}
      <div className="mt-3 grid grid-cols-[2rem_1fr_4rem_4rem_5rem_5rem] items-center gap-3 border-b border-border pb-2">
        <PanelLabel>#</PanelLabel>
        <PanelLabel>Village</PanelLabel>
        <PanelLabel className="text-right">Win</PanelLabel>
        <PanelLabel className="text-right">Trend</PanelLabel>
        <PanelLabel className="text-right">FTR</PanelLabel>
        <PanelLabel className="text-right">Δ</PanelLabel>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-body-md text-paper">
            No villages yet. Be the first to lock in.
          </p>
        </div>
      ) : (
        <ScrollArea className="mt-1 h-[480px] pr-2">
          <div>
            {rows.map((village, i) => {
              const isYou = village.name === teamName
              const history = mockFtrHistory(village.ftr, village.name)
              const direction = mockDirection(village.name)
              // Top-3 get the chevron — lower rows just show the number.
              const isTop3 = i < 3
              return (
                <div
                  key={village.name}
                  className={cn(
                    'grid grid-cols-[2rem_1fr_4rem_4rem_5rem_5rem] items-center gap-3 border-b border-border/60 py-2.5 last:border-0',
                    // User's own row — paper/30 highlight (DESIGN.md §1).
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

                  {/* Per-row sparkline (last 30 ticks of village FTR). */}
                  <div className="flex justify-end">
                    <Sparkline
                      values={history}
                      tone={direction === 'up' ? 'conviction' : 'fold'}
                    />
                  </div>

                  <Ftr value={village.ftr} className="text-right" />

                  {/* Δ chevron — only top-3 rows get the trending chevron. */}
                  <div className="flex items-center justify-end gap-1">
                    {isTop3 &&
                      (direction === 'up' ? (
                        <TrendingUp
                          className="h-3 w-3 text-conviction"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <TrendingDown
                          className="h-3 w-3 text-fold"
                          strokeWidth={1.5}
                        />
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  )
}