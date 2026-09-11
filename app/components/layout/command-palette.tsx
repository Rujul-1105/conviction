'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Gauge,
  Landmark,
  Radio,
  Trophy,
  Wallet,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useRecentsStore } from '@/lib/store/recents-store'
import { Kbd } from '@/components/ui/kbd'

interface RouteEntry {
  href: string
  label: string
  Icon: LucideIcon
  shortcut: string
}

const ROUTES: RouteEntry[] = [
  { href: '/lobby', label: 'Lobby', Icon: Gauge, shortcut: 'G L' },
  {
    href: '/spectate/spectate-demo',
    label: 'Spectate the demo',
    Icon: Radio,
    shortcut: 'G S',
  },
  { href: '/governance', label: 'Governance', Icon: Landmark, shortcut: 'G G' },
  { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy, shortcut: 'G B' },
  { href: '/connect', label: 'Connect wallet', Icon: Wallet, shortcut: 'C' },
]

/**
 * CommandPalette — global ⌘K / Ctrl-K / `/` launcher (DESIGN.md §10 — Phase 8).
 *
 * The single most "cyber-cryptic" surface we ship. Mounted once in <TopNav />
 * so it's available on every route. Listens for ⌘K (Mac), Ctrl-K, and `/`
 * (when no input is focused). Fuzzy-matches a flat list of routes plus the
 * most-recently-visited match under a "HOLD . RESIST . SURVIVE." group.
 *
 * Recent matches persist via `lib/store/recents-store.ts` (localStorage).
 * Selection pushes via Next router and closes the dialog.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const recents = useRecentsStore((s) => s.recents)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (inField) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Find a route, a match, a rule…" />
      <CommandList>
        <CommandEmpty>
          <span className="font-mono text-body-sm text-whisper">
            Nothing on the ledger.
          </span>
        </CommandEmpty>

        {recents.length > 0 && (
          <CommandGroup
            heading="HOLD . RESIST . SURVIVE."
            className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.22em]"
          >
            {recents.map((r) => (
              <CommandItem
                key={r.id}
                value={`match-${r.id}-${r.label}`}
                onSelect={() => go(`/match/${r.id}/live`)}
                className="font-mono"
              >
                <ArrowRight className="h-4 w-4 text-conviction" />
                <span className="text-paper">{r.label}</span>
                {r.mode && (
                  <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-whisper">
                    {r.mode}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Routes">
          {ROUTES.map((route) => (
            <CommandItem
              key={route.href}
              value={route.label}
              onSelect={() => go(route.href)}
              className="font-mono"
            >
              <route.Icon className="h-4 w-4 text-whisper" strokeWidth={1.5} />
              <span className="text-paper">{route.label}</span>
              <CommandShortcut>
                <span className="font-mono text-[10px] text-whisper">
                  {route.shortcut}
                </span>
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <div className="border-t border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-whisper">
          <Kbd>⌘K</Kbd> or <Kbd>Ctrl-K</Kbd> or <Kbd>/</Kbd> to summon ·{' '}
          <Kbd>↵</Kbd> to open
        </div>
      </CommandList>
    </CommandDialog>
  )
}
