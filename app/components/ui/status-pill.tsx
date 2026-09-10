import { cn } from '@/lib/utils'

/**
 * Status pill (DESIGN.md §6).
 *
 * The single most reused component — every team status, phase and spectator
 * badge is one of these. Each variant maps to exactly one semantic colour:
 * hold-blue for still holding, fold-red for folded, volatility-purple for
 * spectators, chaos-yellow for chaos, muted for anything pending.
 *
 * Note `conviction` is a variant but green is reserved (DESIGN.md §1) — use it
 * only for a won/in-the-money state, never as generic emphasis.
 */
export type StatusVariant =
  | 'holding'
  | 'folded'
  | 'spectating'
  | 'chaos'
  | 'pending'
  | 'conviction'

const variantStyles: Record<StatusVariant, string> = {
  holding: 'bg-hold/10 text-hold border-hold/30',
  folded: 'bg-fold/10 text-fold border-fold/30',
  spectating: 'bg-volatility/10 text-volatility border-volatility/30',
  chaos: 'bg-chaos/10 text-chaos border-chaos/30',
  pending: 'bg-surface text-text-muted border-border',
  conviction: 'bg-conviction/10 text-conviction border-conviction/30',
}

export function StatusPill({
  variant,
  children,
  className,
  /** Show a leading dot — used for the live indicator, which pulses. */
  dot = false,
  pulse = false,
}: {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'font-mono text-label uppercase',
        'border whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
            pulse && 'animate-live-pulse',
          )}
        />
      )}
      {children}
    </span>
  )
}

/** Map a team status to its pill variant, so callers don't repeat this. */
export function teamStatusVariant(
  status: 'forming' | 'ready' | 'holding' | 'folded' | 'won',
): StatusVariant {
  switch (status) {
    case 'holding':
      return 'holding'
    case 'folded':
      return 'folded'
    case 'won':
      return 'conviction'
    default:
      return 'pending'
  }
}
