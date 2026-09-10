'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import type { RoundEvent, RoundEventType } from '@/lib/api'
import { eventEnter, motionSafe } from '@/lib/motion'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Event feed (DESIGN.md §10 priority 5).
 *
 * Newest first. Each event type gets exactly one colour, per DESIGN.md §1:
 * folds are fold-red, chaos is chaos-yellow, wins are conviction-green, and
 * routine price ticks stay muted so they don't compete with the dramatic ones.
 */
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

export function EventFeed({ events }: { events: RoundEvent[] }) {
  const reduced = useReducedMotion()

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <PanelLabel>Event feed</PanelLabel>
        <Num size="sm" className="text-whisper">
          {events.length}
        </Num>
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
        {events.length === 0 && (
          <p className="text-body-sm text-text-muted">
            Nothing has happened yet.
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
              className="flex items-baseline gap-2 border-b border-border/60 pb-1.5 last:border-0"
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
              <Num size="sm" className="shrink-0 text-whisper">
                {timeAgo(event.timestamp)}
              </Num>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}
