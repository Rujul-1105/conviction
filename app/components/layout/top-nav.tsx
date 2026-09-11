'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useMotionValueEvent, useScroll } from 'framer-motion'
import { useState } from 'react'
import { Ftr } from '@/components/ui/num'
import { useGameWallet, useWalletSync } from '@/lib/hooks/use-wallet'
import { cn, shortAddress } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommandPalette } from '@/components/layout/command-palette'
import { NavUserMenu } from '@/components/layout/nav-user-menu'

/**
 * Top navigation (Phase 8 redesign).
 *
 * Also the mount point for useWalletSync() — it renders on every route, so the
 * adapter-to-store bridge runs app-wide without a dedicated provider.
 *
 * WalletMultiButton is loaded with ssr:false deliberately: it reads `window`
 * during render, which produces a hydration mismatch if server-rendered.
 *
 * Phase 8 polish:
 *  - Logo block uses the shipped `logo_icon.png` at 28px with the wordmark
 *    text + the HOLD . RESIST . SURVIVE. motto micro-line on md+.
 *  - Subtle surface shift on scroll (ink → surface-elevated, border tightens).
 *  - Tooltip provider is mounted here so every nav surface gets hover hints.
 *  - Global CommandPalette is mounted here — listens for ⌘K / Ctrl-K / `/`.
 *  - Wallet on md+ wraps in <NavUserMenu> so the address / win rate /
 *    disconnect surface lives in a Radix portal.
 */
const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-[152px] rounded-md border border-border bg-surface" />
    ),
  },
)

const LINKS = [
  { href: '/lobby', label: 'Lobby' },
  { href: '/governance', label: 'Governance' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function TopNav({ sticky = true }: { sticky?: boolean }) {
  useWalletSync()
  const { connected, ftrBalance } = useGameWallet()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 8)
  })

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          'z-40 w-full border-b backdrop-blur-sm transition-colors duration-150',
          sticky && 'sticky top-0',
          scrolled
            ? 'border-border/60 bg-surface-elevated/95'
            : 'border-transparent bg-ink/95',
        )}
      >
        <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4">
          {/* Logo. Wordmark + tagline micro-line. Brand-mark exception (DESIGN.md §1). */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo/logo_icon.png"
              width={28}
              height={28}
              alt="Conviction"
              priority
              className="shrink-0"
            />
            <span className="flex flex-col leading-none">
              <span className="font-display text-body-lg font-bold tracking-tight text-paper">
                Conviction
              </span>
              <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-whisper md:block">
                HOLD . RESIST . SURVIVE.
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 font-mono text-body-sm text-text-muted transition-colors hover:bg-surface hover:text-paper"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            {connected && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-whisper">
                  FTR
                </span>
                <Ftr value={ftrBalance} />
              </div>
            )}
            {connected ? (
              <NavUserMenu />
            ) : (
              <WalletMultiButton />
            )}
          </div>
        </div>
      </header>
      <CommandPalette />
    </TooltipProvider>
  )
}

/** Compact wallet identity line, for pages that show the address inline. */
export function WalletIdentity() {
  const { address, teamName, winRate } = useGameWallet()
  if (!address) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
      <span className="text-paper">{teamName ?? 'Unaffiliated'}</span>
      <span className="font-mono tabular-nums text-text-muted">
        {shortAddress(address)}
      </span>
      <span className="font-mono tabular-nums text-text-muted">
        {(winRate * 100).toFixed(0)}% win rate
      </span>
    </div>
  )
}