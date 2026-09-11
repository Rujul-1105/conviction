'use client'

import { forwardRef } from 'react'
import { motion, type MotionProps, useReducedMotion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button (DESIGN.md §6).
 *
 * Variants encode the palette rules so callers can't get them wrong:
 *   primary   — conviction green. The ONE main action per screen.
 *   danger    — fold red. Folding and stop-loss only, never generic errors.
 *   secondary — bordered surface. Everything else.
 *   ghost     — text only, for tertiary nav.
 *   spectator — volatility purple. The single affordance for the spectator class.
 *
 * Radius is fixed at 6px (rounded-md) per DESIGN.md; no shadows anywhere.
 * Transitions are on colour only — never on layout or numbers.
 *
 * Phase 8 additions:
 *  - `loading` slot swaps the label for a mono `•••` while preserving button
 *    width so the layout doesn't shift mid-submit.
 *  - MotionButton wrapper applies a 0.98 scale on press for the live-round
 *    action bar. Caller decides which to use by importing either `Button` or
 *    `MotionButton`.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-bold rounded-md',
    'transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-40',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-conviction text-ink hover:bg-conviction-dim focus-visible:ring-conviction/50',
        danger:
          'border border-fold text-fold hover:bg-fold hover:text-paper focus-visible:ring-fold/40',
        secondary:
          'border border-border bg-surface text-paper hover:bg-surface-elevated focus-visible:ring-hold',
        ghost:
          'text-text-muted hover:text-paper hover:bg-surface focus-visible:ring-hold',
        spectator:
          'border border-volatility text-volatility hover:bg-volatility hover:text-paper focus-visible:ring-volatility/40',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm',
        md: 'h-10 px-4 text-body-md',
        lg: 'h-12 px-6 text-body-lg',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Swaps label for a mono `•••` while preserving button width. */
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="font-mono text-paper/80" aria-label="Loading">
          •••
        </span>
      ) : (
        children
      )}
    </button>
  ),
)
Button.displayName = 'Button'

/**
 * MotionButton — same surface as Button, with an 80ms press scale. Use only
 * where the press feedback earns its keep (live round hold/fold, signature
 * CTAs). Reduced-motion collapses the scale to a no-op.
 */
export const MotionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & MotionProps
>(
  (
    { className, variant, size, loading, children, disabled, ...props },
    ref,
  ) => {
    const reduced = useReducedMotion()
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.08, ease: 'easeOut' }}
        {...(props as MotionProps)}
      >
        {loading ? (
          <span className="font-mono text-paper/80" aria-label="Loading">
            •••
          </span>
        ) : (
          children
        )}
      </motion.button>
    )
  },
)
MotionButton.displayName = 'MotionButton'

export { buttonVariants }
