'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Num } from '@/components/ui/num'
import { PanelLabel } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { Countdown } from '@/components/ui/countdown'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { chaosPulse, motionSafe } from '@/lib/motion'
import { useMatchStore } from '@/lib/store/match-store'

/**
 * Hero round timer (DESIGN.md §10 priority 5).
 *
 * Phase 8 polish: the timer body now delegates to the shared `<Countdown>`
 * primitive (snap digits, container tick-flash when urgent, fold-red final
 * minute). A `<Tooltip>` wraps it so hovering shows the absolute end time —
 * the digits still snap, the tooltip is the only place a human-readable
 * clock lives.
 *
 * The Round label + Live/Settled pill stay as siblings so the timer still
 * reads as a labelled control, not a free-floating number.
 */

function formatAbsoluteTime(endTime: number | undefined): string {
  if (!endTime) return '—'
  const d = new Date(endTime)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function RoundTimer({
  endTime,
  roundNumber,
  status,
}: {
  endTime: number | undefined
  roundNumber: number
  status: 'forming' | 'live' | 'ended'
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <PanelLabel>Round {roundNumber}</PanelLabel>
              {status === 'live' && endTime && endTime > Date.now() ? (
                <StatusPill variant="holding" dot pulse>
                  Live
                </StatusPill>
              ) : (
                <StatusPill variant="pending">
                  {status === 'ended' || (endTime && endTime <= Date.now())
                    ? 'Settled'
                    : 'Forming'}
                </StatusPill>
              )}
            </div>

            {/* Countdown handles urgent colouring + container flash; we just
                hand it the absolute end time. */}
            {endTime ? (
              <div className="mt-1">
                <Countdown endTime={endTime} />
              </div>
            ) : (
              <span className="mt-1 font-mono text-display-lg font-bold tabular-nums leading-none text-whisper">
                --:--
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>Round ends at {formatAbsoluteTime(endTime)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
