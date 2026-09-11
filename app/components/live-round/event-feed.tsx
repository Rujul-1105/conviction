'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RoundEvent, RoundEventType } from '@/lib/api'
import { eventEnter, motionSafe } from '@/lib/motion'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Event feed (DESIGN.md §10 priority 5).
 *
 * Newest first. Each event type gets exactly one colour, per DESIGN.md §1:
 * folds are fold-red, chaos is chaos-yellow, wins are conviction-green, and
 * routine price ticks stay muted so they don't compete with the dramatic ones.
 *
 * Phase 8 polish:
 *  - shadcn ScrollArea (8px scrollbar) replaces the raw overflow-auto div.
 *  - 1px left border colour-matches the event type, so the feed reads as a
 *    vertical timeline you can scan at a glance.
 *  - Each row's relative time is wrapped in a Tooltip showing the absolute
 *    timestamp — operators want both.
 *  - Initial loading renders three Skeleton rows instead of a spinner
 *    (DESIGN.md §14: no spinners, ever).
 */

/** Text colour per event type (existing). */
const TYPE_CLASS: Record<RoundEventType, string> = {
  round_start: 'text-hold',
  round_end: 'text-hold',
  fold: 'text-fold',
  chaos: 'text-chaos',
  price: 'text-text-muted',
  win: 'text-conviction',
  team_join: 'text-text-muted',
  lock_in: 'text-paper',
}

/** Left-border colour per event type — kept separate so the timeline
 *  gutter doesn't drift from the row text colour. */
const TYPE_BORDER: Record<RoundEventType, string> = {
  round_start: 'border-l-hold',
  round_end: 'border-l-hold',
  fold: 'border-l-fold',
  chaos: 'border-l-chaos',
  price: 'border-l-border',
  win: 'border-l-conviction',
  team_join: 'border-l-border',
  lock_in: 'border-l-border',
}

/** Short uppercase tag for the left gutter. */
const TYPE_TAG: Record<RoundEventType, string> = {
  round_start: 'START',
  round_end: 'END',
  fold: 'FOLD',
  chaos: 'CHAOS',
  price: 'TICK',
  win: 'WIN',
  team_join: 'JOIN',
  lock_in: 'LOCK',
}

function formatAbsolute(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    month: 'short',
    day: 'numeric',
  })
}

export function EventFeed({
  events,
  isLoading = false,
}: {
  events: RoundEvent[]
  isLoading?: boolean
}) {
  const reduced = useReducedMotion()

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <PanelLabel>Event feed</PanelLabel>
        <Num size="sm" className="text-whisper">
          {events.length}
        </Num>
      </div>

      <ScrollArea className="mt-3 flex-1">
        <div className="space-y-1.5 pr-3">
          {/* Loading state: three skeleton rows. No spinner, ever — DESIGN.md §14. */}
          {isLoading && events.length === 0 && (
            <>
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="h-6 w-full rounded-sm border-l-2 border-l-border"
                />
              ))}
            </>
          )}

          {!isLoading && events.length === 0 && (
            <p className="text-body-sm text-text-muted">
              Quiet so far. The chaos lands in waves.
            </p>
          )}

          {/* AnimatePresence with initial={false} so the seeded backlog doesn't
              all fly in on first paint — only genuinely new events animate.
              No `layout` prop: FLIP-animating these rows made incoming and
              outgoing text overlap mid-flight, which read as a rendering bug. */}
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                variants={motionSafe(eventEnter, reduced)}
                initial="hidden"
                animate="visible"
                className={cn(
                  'flex items-baseline gap-2 border-b border-l-2 border-border/60 pb-1.5 pl-2 last:border-b-0',
                  TYPE_BORDER[event.type],
                )}
              >
                <span
                  className={cn(
                    'w-11 shrink-0 font-mono text-label uppercase',
                    TYPE_CLASS[event.type],
                  )}
                >
                  {TYPE_TAG[event.type]}
                </span>
                <p className="flex-1 text-body-sm text-paper">{event.message}</p>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Num size="sm" className="shrink-0 text-whisper">
                        {timeAgo(event.timestamp)}
                      </Num>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatAbsolute(event.timestamp)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </Card>
  )
}
