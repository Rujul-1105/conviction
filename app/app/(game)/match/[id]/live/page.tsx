import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { MissionControl } from '@/components/live-round/mission-control'

/**
 * Live round (DESIGN.md §10 priority 5) — the demo centerpiece.
 *
 * Thin wrapper: all the density lives in MissionControl, which /spectate also
 * renders in spectator mode.
 */
export default function LivePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />
        <main className="min-w-0 flex-1">
          <MissionControl matchId={params.id} mode="player" />
        </main>
      </div>
    </div>
  )
}
