'use client'

import { LeftRail } from '@/components/layout/left-rail'
import { TopNav, WalletIdentity } from '@/components/layout/top-nav'
import { CreateMatchModal } from '@/components/lobby/create-match-modal'
import { LiveNowColumn, TopVillages } from '@/components/lobby/live-now-column'
import { MatchCard } from '@/components/lobby/match-card'
import { Card, PanelLabel } from '@/components/ui/card'
import { useOpenMatches } from '@/lib/hooks/use-matches'

/**
 * Lobby (DESIGN.md §10 priority 3).
 *
 * Two-column on desktop: open matches take the wide lane, live rounds and the
 * village leaderboard sit in the rail. Left icon rail comes from the shared
 * layout components.
 */
export default function LobbyPage() {
  const { data: openMatches, isLoading } = useOpenMatches()

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />

        <main className="flex-1 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-heading-lg font-bold text-paper">
                Lobby
              </h1>
              <div className="mt-1">
                <WalletIdentity />
              </div>
            </div>
            <CreateMatchModal />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section>
              <PanelLabel>Open matches</PanelLabel>
              <div className="mt-3 space-y-3">
                {isLoading && (
                  <Card className="p-6">
                    <p className="text-body-sm text-text-muted">
                      Loading matches…
                    </p>
                  </Card>
                )}

                {!isLoading && !openMatches?.length && (
                  <Card className="p-6">
                    <p className="text-body-md text-paper">
                      No open matches right now.
                    </p>
                    <p className="mt-1 text-body-sm text-text-muted">
                      Create one and a rival village will fill the other side.
                    </p>
                  </Card>
                )}

                {openMatches?.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <LiveNowColumn />
              <TopVillages />
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}
