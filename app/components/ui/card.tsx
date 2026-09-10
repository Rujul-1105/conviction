import { cn } from '@/lib/utils'

/**
 * Card / panel primitives (DESIGN.md §6).
 *
 * The canonical surface: bg-surface, 1px border, 6px radius, no shadow.
 * `interactive` adds a hover state for cards that are links or buttons —
 * a border lift rather than elevation, since shadows are banned.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-md',
        interactive &&
          'transition-colors duration-150 hover:bg-surface-elevated hover:border-whisper/40',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pb-0', className)} {...props} />
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}

/**
 * Uppercase micro-label used for panel titles and table headers.
 * Always mono + tracked — it reads as instrumentation, not prose.
 */
export function PanelLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'font-mono text-label uppercase text-whisper',
        className,
      )}
      {...props}
    />
  )
}

/** Hairline divider. 1px, border colour, never thicker. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} />
}
