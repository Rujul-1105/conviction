'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCountdown } from '@/lib/hooks/use-countdown'

/**
 * Countdown timer (DESIGN.md §10 priority 5 — live round centerpiece).
 *
 * Replaces the prior `RoundTimer` field with a single component that:
 *  - snaps the digits (no transition on the numeric span)
 *  - flashes the *container* every second when `urgent === true` (final 60s)
 *  - folds red in the final minute
 *  - never fades digits, per DESIGN.md §1 ("snap, don't fade")
 *
 * The container flash is driven by JS via a re-keyed motion.div so the
 * `tick-flash` keyframe restarts cleanly every second. Reduced-motion kills
 * the flash; digits still snap.
 */
export function Countdown({
  endTime,
  className,
}: {
  endTime: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const { clock, urgent, expired } = useCountdown(endTime)
  const [tickKey, setTickKey] = useState(0)

  // Bump the container's React key once per second so the CSS animation
  // restarts. Only fires when urgent so the regular tick doesn't keep paying
  // a render cost.
  useEffect(() => {
    if (!urgent || expired || reduced) return
    const id = setInterval(() => setTickKey((k) => k + 1), 1000)
    return () => clearInterval(id)
  }, [urgent, expired, reduced])

  return (
    <motion.div
      key={tickKey}
      className={cn(
        'inline-flex flex-col items-center gap-1 rounded-md border border-border bg-surface px-4 py-2',
        urgent && !expired && 'border-fold/40',
        className,
      )}
      // Animation re-fires only when reduced-motion is off.
      animate={reduced ? undefined : { opacity: [0.85, 1] }}
      transition={reduced ? undefined : { duration: 0.12, ease: 'easeOut' }}
    >
      <span
        className={cn(
          'font-mono text-display-lg font-bold tabular-nums leading-none',
          urgent && !expired ? 'text-fold' : 'text-paper',
        )}
      >
        {expired ? '00:00' : clock}
      </span>
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.2em]',
          urgent && !expired ? 'text-fold' : 'text-whisper',
        )}
      >
        {urgent && !expired ? 'Final minute' : 'Until lock'}
      </span>
    </motion.div>
  )
}
