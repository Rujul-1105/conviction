import { cn } from '@/lib/utils'
import { formatPct, formatPrice, formatSol } from '@/lib/utils'

/**
 * Number displays (DESIGN.md §6).
 *
 * Three hard rules, enforced here so no caller has to remember them:
 *   1. Always mono with tabular figures, so digits don't shift as values change.
 *   2. NEVER a transition. DESIGN.md §14: "No transitions on numbers. Snap
 *      updates only." There is deliberately no `transition-*` class below, and
 *      none should be added — animate a container's background instead.
 *   3. Signed values always show their sign, so +4.2% and -8.1% are the same
 *      width and the column stays aligned.
 */

/** Raw mono number. Use when you've already formatted the string. */
export function Num({
  children,
  className,
  size = 'md',
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizes = {
    sm: 'text-body-sm',
    md: 'text-body-md',
    lg: 'text-body-lg',
    xl: 'text-heading-md',
  }
  return (
    <span className={cn('font-mono tabular-nums', sizes[size], className)}>
      {children}
    </span>
  )
}

/**
 * P&L percentage, auto-coloured: green in the money, red down, muted at zero.
 * Exactly flat is muted — a zero position is not "in the money".
 */
export function Pnl({
  value,
  className,
  size = 'md',
  decimals = 1,
}: {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  decimals?: number
}) {
  const color =
    value > 0 ? 'text-conviction' : value < 0 ? 'text-fold' : 'text-text-muted'
  return (
    <Num size={size} className={cn(color, className)}>
      {formatPct(value, decimals)}
    </Num>
  )
}

/** SOL amount, e.g. "12.4 SOL". Neutral colour — a pot isn't a gain. */
export function SolAmount({
  value,
  className,
  size = 'md',
  decimals = 1,
}: {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  decimals?: number
}) {
  return (
    <Num size={size} className={cn('text-paper', className)}>
      {formatSol(value, decimals)}
    </Num>
  )
}

/** USD price with magnitude-aware precision. */
export function Price({
  value,
  className,
  size = 'md',
}: {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <Num size={size} className={cn('text-paper', className)}>
      {formatPrice(value)}
    </Num>
  )
}

/**
 * FTR balance. The one place conviction green is correct for a plain number
 * (DESIGN.md §1 lists FTR balance explicitly).
 */
export function Ftr({
  value,
  className,
  size = 'md',
}: {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <Num size={size} className={cn('text-conviction', className)}>
      {value.toLocaleString('en-US')}
    </Num>
  )
}
