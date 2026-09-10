'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Num } from '@/components/ui/num'
import { PanelLabel } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { useCountdown } from '@/lib/hooks/use-countdown'
import { chaosPulse, motionSafe } from '@/lib/motion'
import { useMatchStore } from '@/lib/store/match-store'
import { cn } from '@/lib/utils'

/**
 * Hero round timer (DESIGN.md §10 priority 5).
 *
 * The single largest number on the screen. Mono, tabular, and with NO
 * transition — it snaps each second (DESIGN.md §14). Shifts to fold red in the
 * final minute, which is the only colour change; the digits never animate.
 */
export function RoundTimer({
  endTime,
  roundNumber,
  status,
}: {
  endTime: number | undefined
  roundNumber: number
  status: 'forming' | 'live' | 'ended'
}) {
  const { clock, urgent, expired } = useCountdown(endTime)

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        <PanelLabel>Round {roundNumber}</PanelLabel>
        {status === 'live' && !expired ? (
          <StatusPill variant="holding" dot pulse>
            Live
          </StatusPill>
        ) : (
          <StatusPill variant="pending">
            {status === 'ended' || expired ? 'Settled' : 'Forming'}
          </StatusPill>
        )}
      </div>

      <span
        className={cn(
          'mt-1 font-mono tabular-nums text-display-lg font-bold leading-none',
          urgent ? 'text-fold' : 'text-paper',
        )}
      >
        {clock}
      </span>

      {urgent && !expired && (
        <span className="mt-1 font-mono text-label uppercase text-fold">
          Final minute
        </span>
      )}
    </div>
  )
}

/**
 * Chaos banner. Flashes, then removes itself after 6s — DESIGN.md §1 is
 * explicit that chaos yellow "flashes, never sits". The auto-clear is the
 * mechanism that enforces that rule.
 */
export function ChaosBanner() {
  const { activeChaos, clearChaos } = useMatchStore()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!activeChaos) return
    const t = setTimeout(clearChaos, 6000)
    return () => clearTimeout(t)
  }, [activeChaos, clearChaos])

  if (!activeChaos) return null

  return (
    <motion.div
      variants={motionSafe(chaosPulse, reduced)}
      initial="initial"
      animate="pulse"
      className="flex items-center gap-3 rounded-md border border-chaos/40 bg-chaos/10 px-4 py-3"
    >
      <Zap className="h-4 w-4 shrink-0 text-chaos" />
      <div className="min-w-0">
        <Num size="sm" className="text-chaos">
          CHAOS EVENT
        </Num>
        <p className="truncate text-body-sm text-paper">{activeChaos}</p>
      </div>
      <button
        type="button"
        onClick={clearChaos}
        className="ml-auto shrink-0 font-mono text-label uppercase text-whisper transition-colors hover:text-paper"
      >
        Dismiss
      </button>
    </motion.div>
  )
}
