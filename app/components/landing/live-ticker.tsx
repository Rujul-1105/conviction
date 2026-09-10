'use client'

import Link from 'next/link'
import { Num, Pnl, SolAmount } from '@/components/ui/num'
import { StatusPill } from '@/components/ui/status-pill'
import { useLiveMatches } from '@/lib/hooks/use-matches'

/**
 * Live ticker strip (DESIGN.md §10 priority 1).
 *
 * A horizontal marquee-style rail of currently-live rounds. Deliberately shows
 * the last known values with no spinner while refetching — PLAN.md is explicit
 * that live surfaces should never spin, they should show stale data.
 */
export function LiveTicker() {
  const { data: matches, isLoading } = useLiveMatches()

  // Only the very first load gets a placeholder; refetches keep prior data.
  if (isLoading) {
    return (
      <div className="border-y border-border bg-surface/40">
        <div className="mx-auto flex h-14 max-w-content items-center px-4">
          <span className="font-mono text-label uppercase text-whisper">
            Loading rounds…
          </span>
        </div>
      </div>
    )
  }

  if (!matches?.length) return null

  return (
    <div className="border-y border-border bg-surface/40">
      <div className="mx-auto flex max-w-content items-center gap-4 overflow-x-auto px-4 py-3 scrollbar-thin">
        <StatusPill variant="holding" dot pulse className="shrink-0">
          Live
        </StatusPill>

        <div className="flex items-center gap-3">
          {matches.map((match) => {
            // Show the leading village — that's the number worth glancing at.
            const leader = [...match.teams].sort((a, b) => b.pnl - a.pnl)[0]
            return (
              <Link
                key={match.id}
                href={`/spectate/${match.id}`}
                className="flex shrink-0 items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-elevated"
              >
                <span className="font-mono text-label uppercase text-whisper">
                  R{match.roundNumber}
                </span>
                <span className="max-w-[180px] truncate text-body-sm text-paper">
                  {leader?.name ?? 'Forming'}
                </span>
                {leader && <Pnl value={leader.pnl} size="sm" />}
                <span className="text-border">|</span>
                <SolAmount value={match.pot} size="sm" />
                {match.chaosEventCount > 0 && (
                  <Num size="sm" className="text-chaos">
                    {match.chaosEventCount}x chaos
                  </Num>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
