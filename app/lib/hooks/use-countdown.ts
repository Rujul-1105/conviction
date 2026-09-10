'use client'

import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/utils'

/**
 * Round countdown (DESIGN.md §7).
 *
 * Ticks once per second. The returned figures render in a mono tabular lane,
 * and per DESIGN.md §1 they must snap — never attach a transition to them.
 *
 * `endTime` is unix ms. Pass 0/undefined for a match that hasn't started; the
 * hook reports expired rather than counting down from a nonsense value.
 */
export function useCountdown(endTime: number | undefined) {
  const [remaining, setRemaining] = useState(() =>
    endTime ? Math.max(0, endTime - Date.now()) : 0,
  )

  useEffect(() => {
    if (!endTime) {
      setRemaining(0)
      return
    }

    // Set immediately so we don't show a stale first frame for up to a second.
    setRemaining(Math.max(0, endTime - Date.now()))

    const interval = setInterval(() => {
      setRemaining(Math.max(0, endTime - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return {
    minutes,
    seconds,
    remaining,
    expired: remaining <= 0,
    /** Pre-formatted "mm:ss" for the hero timer. */
    clock: formatClock(minutes, seconds),
    /** True in the last 60s — screens use this to shift the timer to fold red. */
    urgent: remaining > 0 && remaining <= 60_000,
  }
}
