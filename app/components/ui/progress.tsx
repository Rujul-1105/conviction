"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

export type ProgressTone = 'default' | 'conviction' | 'hold' | 'fold'

/**
 * Progress (DESIGN.md §6).
 *
 * Linear meter used for pot share, fill percentage, stop-loss band position.
 * The default tone is the brand hold-blue; call sites pass `tone="conviction"`
 * for in-the-money state, `tone="fold"` for fold-side meters, etc.
 *
 * No shadows, no animations — DESIGN.md §14 bans transitions on numbers and
 * meters; the indicator's `transition-all` is the only motion and is reserved
 * for value-driven width changes.
 */
const toneClasses: Record<ProgressTone, string> = {
  default: 'bg-primary',
  conviction: 'bg-conviction',
  hold: 'bg-hold',
  fold: 'bg-fold',
}

const trackClasses: Record<ProgressTone, string> = {
  default: 'bg-primary/20',
  conviction: 'bg-conviction/15',
  hold: 'bg-hold/20',
  fold: 'bg-fold/15',
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    tone?: ProgressTone
  }
>(({ className, value, tone = 'default', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full',
      trackClasses[tone],
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full w-full flex-1 transition-all', toneClasses[tone])}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
