import { forwardRef } from 'react'
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
 *
 * Radius is fixed at 6px (rounded-md) per DESIGN.md; no shadows anywhere.
 * Transitions are on colour only — never on layout or numbers.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-bold rounded-md',
    'transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-40',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-conviction text-ink hover:bg-conviction-dim',
        danger:
          'border border-fold text-fold hover:bg-fold hover:text-paper',
        secondary:
          'border border-border bg-surface text-paper hover:bg-surface-elevated',
        ghost: 'text-text-muted hover:text-paper hover:bg-surface',
        spectator:
          'border border-volatility text-volatility hover:bg-volatility hover:text-paper',
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
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
