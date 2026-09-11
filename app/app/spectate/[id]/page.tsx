import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { MissionControl } from '@/components/live-round/mission-control'

/**
 * Spectator view (DESIGN.md §10 priority 7).
 *
 * Same MissionControl as the player screen in spectator mode: action bar
 * replaced by the sealed PredictionPanel, stop-loss panel hidden (it's private
 * to the village), a SPECTATING pill, and a 5% volatility-purple wash.
 *
 * Not inside the (game) route group — spectating needs no wallet or membership.
 */
export default function SpectatePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PageBackdrop>
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />
        <main className="min-w-0 flex-1">
          <MissionControl matchId={params.id} mode="spectator" />
        </main>
      </div>
      </PageBackdrop>
    </div>
  )
}
