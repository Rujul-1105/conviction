'use client'

import Link from 'next/link'
import { Num, Pnl, SolAmount } from '@/components/ui/num'
import { Card } from '@/components/ui/card'
import { Marquee } from '@/components/ui/marquee'
import { StatusPill } from '@/components/ui/status-pill'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLiveMatches } from '@/lib/hooks/use-matches'

/**
 * Live ticker strip — the marquee (DESIGN.md §10 priority 1, Phase 8 polish).
 *
 * Three rules the implementer must hold:
 *  1. NEVER a spinner. Stale data is rendered as stale (left-edge chaos
 *     stripe + Tooltip), never hidden behind a loading state. DESIGN.md §1.
 *  2. The marquee is a SIGNATURE affordance, not a layout primitive — this
 *     strip and the chaos strip on the live round are the only authorised
 *     surfaces for it.
 *  3. The motto micro-line lives on the trailer card so the "HOLD . RESIST .
 *     SURVIVE." identity carries through the marquee without re-stating it
 *     in the hero or the nav.
 */

// No spinners. Lock the rule per DESIGN.md §1.
const STALE_THRESHOLD_MS = 15_000

export function LiveTicker() {
  const { data: matches, isLoading, dataUpdatedAt } = useLiveMatches()

  // Only the very first load gets a placeholder; refetches keep prior data.
  if (isLoading) {
    return (
      <div className="border-y border-border bg-surface/40">
        <div className="mx-auto flex h-14 max-w-content items-center px-4">
          <span className="font-mono text-label uppercase text-whisper">
            Reading the rollup
          </span>
        </div>
      </div>
    )
  }

  if (!matches?.length) return null

  const isStale = dataUpdatedAt
    ? Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS
    : false

  return (
    <Marquee speed="slow" className="bg-surface/40">
      {/* Status pill — announces the strip as "Live". Rendered inside the
          marquee so it scrolls with the cards; on hover the parent pauses. */}
      <StatusPill
        variant="holding"
        dot
        pulse
        className="shrink-0"
      >
        Live
      </StatusPill>

      {/* Match cards. The marquee component duplicates children internally
          (the second copy is aria-hidden for a seamless loop). */}
      {matches.map((match) => (
        <TickerCard key={match.id} match={match} isStale={isStale} />
      ))}

      {/* Trailer card — carries the motto and the spectator entry. Per the
          Phase 8 brief, "Spectate" lives here, NOT in the hero CTA row. */}
      <Link
        href="/spectate/spectate-demo"
        className="flex shrink-0 items-center gap-3"
      >
        <Card className="border border-border bg-surface-elevated rounded-md px-4 py-3 transition-colors hover:border-conviction/40">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-whisper">
            HOLD . RESIST . SURVIVE.
          </span>
          <span className="ml-3 text-body-sm text-paper">
            Spectate the live demo
          </span>
          <span className="ml-2 text-conviction" aria-hidden>
            →
          </span>
        </Card>
      </Link>
    </Marquee>
  )
}

/**
 * A single match card in the marquee.
 *
 * Extracted to keep the parent tidy. When the React Query data is older than
 * the stale threshold (a missed 3s poll × 5 cycles), we add a 4px chaos
 * stripe to the left edge and surface a Tooltip explaining the state — no
 * spinner, no skeleton, no "Loading…" copy. The judge can still read the
 * values; the stripe tells them those values are old.
 */
function TickerCard({
  match,
  isStale,
}: {
  match: import('@/lib/api').Match
  isStale: boolean
}) {
  // Show the leading village — that's the number worth glancing at.
  const leader = [...match.teams].sort((a, b) => b.pnl - a.pnl)[0]

  const card = (
    <Card
      className={
        'shrink-0 border border-border bg-surface-elevated rounded-md p-4 transition-colors hover:border-conviction/40' +
        (isStale ? ' border-l-4 border-l-chaos' : '')
      }
    >
      <div className="flex items-center gap-3">
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
      </div>
    </Card>
  )

  // The stale hint wraps the card (not the link) so the tooltip follows the
  // visual element. When fresh, render plain to keep the markup lean.
  if (!isStale) {
    return (
      <Link
        href={`/spectate/${match.id}`}
        className="flex shrink-0"
      >
        {card}
      </Link>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`/spectate/${match.id}`} className="flex shrink-0">
          {card}
        </Link>
      </TooltipTrigger>
      <TooltipContent>Stale — refreshing</TooltipContent>
    </Tooltip>
  )
}