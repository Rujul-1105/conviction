'use client'

import { cn } from '@/lib/utils'

/**
 * Live-ticker marquee (DESIGN.md §10 priority 1).
 *
 * Wraps the `animate-marquee-ticker` keyframe. Two copies of the children
 * render side-by-side; the inner track animates by -50% so the loop is
 * seamless. `group-hover` pauses the animation — the user can read a card
 * without losing their place.
 *
 * Use sparingly — only the landing LiveTicker and the chaos strip on the
 * live round are authorised surfaces (DESIGN.md §1: marquee is a signature
 * affordance, not a layout primitive).
 */
export function Marquee({
  children,
  className,
  speed = 'normal',
}: {
  children: React.ReactNode
  className?: string
  /** Visual cadence. Slow matches the landing marquee; fast is reserved for in-page chaos strips. */
  speed?: 'slow' | 'normal' | 'fast'
}) {
  const duration = speed === 'slow' ? 75 : speed === 'fast' ? 25 : 50

  return (
    <div
      className={cn(
        'group relative flex w-full overflow-hidden border-y border-border bg-surface/40',
        '[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]',
        className,
      )}
    >
      <div
        className="flex shrink-0 gap-4 pr-4"
        style={{
          animation: `marquee-ticker ${duration}s linear infinite`,
          animationPlayState: 'running',
        }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="flex shrink-0 gap-4 pr-4"
        style={{
          animation: `marquee-ticker ${duration}s linear infinite`,
          animationPlayState: 'running',
        }}
      >
        {children}
      </div>
      {/* Pause on hover via the group parent. The inner divs keep animating
          unless the parent carries group-hover state. CSS handles this via the
          .group:hover selector; we leave the className default. */}
      <style jsx>{`
        div:hover > div {
          animation-play-state: paused !important;
        }
      `}</style>
    </div>
  )
}
