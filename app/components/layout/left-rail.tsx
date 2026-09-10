'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gauge, Landmark, Radio, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Left rail — vertical icon nav for the in-game routes (DESIGN.md §10 priority 3).
 *
 * Icons only, with an accessible label via title/sr-only. Icon components from
 * lucide-react; DESIGN.md §14 bans emoji outright.
 *
 * Hidden below md: on narrow screens the top nav carries the same links.
 */
const RAIL = [
  { href: '/lobby', label: 'Lobby', Icon: Gauge },
  { href: '/spectate/live-2', label: 'Spectate', Icon: Radio },
  { href: '/governance', label: 'Governance', Icon: Landmark },
  { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
]

export function LeftRail() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Game sections"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border py-4 md:flex"
    >
      {RAIL.map(({ href, label, Icon }) => {
        // Match on the section root so /spectate/[id] still highlights.
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md',
              'transition-colors duration-150',
              active
                ? 'bg-surface text-paper'
                : 'text-whisper hover:bg-surface hover:text-paper',
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="sr-only">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
