'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Ftr } from '@/components/ui/num'
import { useGameWallet, useWalletSync } from '@/lib/hooks/use-wallet'
import { cn, shortAddress } from '@/lib/utils'

/**
 * Top navigation.
 *
 * Also the mount point for useWalletSync() — it renders on every route, so the
 * adapter-to-store bridge runs app-wide without a dedicated provider.
 *
 * WalletMultiButton is loaded with ssr:false deliberately: it reads `window`
 * during render, which produces a hydration mismatch if server-rendered. This
 * was already established in the Phase 0 spike.
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

  return (
    <header
      className={cn(
        'z-40 w-full border-b border-border bg-ink/95 backdrop-blur-sm',
        sticky && 'sticky top-0',
      )}
    >
      <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4">
        {/* Logo. Conviction green is licensed here (DESIGN.md §1). */}
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-conviction" />
          <span className="font-display text-body-lg font-bold tracking-tight text-paper">
            Conviction
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-body-md text-text-muted transition-colors hover:bg-surface hover:text-paper"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {connected && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-mono text-label uppercase text-whisper">
                FTR
              </span>
              <Ftr value={ftrBalance} />
            </div>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
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
