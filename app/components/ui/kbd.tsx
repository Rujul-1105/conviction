import { cn } from '@/lib/utils'

/**
 * Keyboard shortcut chip — used by the command palette and nav tooltips.
 *
 * Mono micro-type on a 1px-bordered square, locked at 11px so it never
 * breaks line height when it sits inside a 14px row.
 */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-border bg-surface px-1.5 font-mono text-[11px] leading-none text-whisper',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
