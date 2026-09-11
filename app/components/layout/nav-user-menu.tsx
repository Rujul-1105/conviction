'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  Copy,
  ExternalLink,
  LogOut,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { cn, shortAddress } from '@/lib/utils'

/**
 * NavUserMenu — replaces the bare WalletMultiButton on md+.
 *
 * Renders a green primary CTA identical to WalletMultiButton's chrome, but
 * clicking it opens a Radix dropdown with: wallet address (copyable), FTR
 * balance, win-rate readout, disconnect, and a "view on explorer" link.
 *
 * Lives in the nav on every connected route. The disconnected state falls
 * back to the standard WalletMultiButton via TopNav's branching.
 */
export function NavUserMenu() {
  const { publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { ftrBalance, winRate } = useGameWallet()

  if (!publicKey) {
    return (
      <Button
        variant="primary"
        size="md"
        onClick={() => setVisible(true)}
        className="font-display"
      >
        Connect wallet
      </Button>
    )
  }

  const addr = publicKey.toBase58()
  const positive = winRate >= 0.5

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="primary" size="md" className="font-display">
          {shortAddress(addr, 4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 border-border bg-surface-elevated p-0 shadow-none"
      >
        <DropdownMenuLabel className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-whisper">
              Connected
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-conviction">
              live
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <code className="font-mono text-body-sm tabular-nums text-paper">
              {shortAddress(addr, 6)}
            </code>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                navigator.clipboard.writeText(addr)
                toast.success('Copied')
              }}
              className="text-whisper transition-colors hover:text-paper"
              aria-label="Copy address"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </DropdownMenuLabel>

        <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
          <div className="bg-surface-elevated px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-whisper">
              FTR
            </div>
            <div className="mt-1 font-mono text-heading-md tabular-nums text-conviction">
              {ftrBalance.toLocaleString('en-US')}
            </div>
          </div>
          <div className="bg-surface-elevated px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-whisper">
              Win rate
            </div>
            <div
              className={cn(
                'mt-1 flex items-baseline gap-1 font-mono text-heading-md tabular-nums',
                positive ? 'text-conviction' : 'text-fold',
              )}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              {(winRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <Link
          href={`https://explorer.solana.com/address/${addr}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 font-mono text-body-sm text-text-muted transition-colors hover:bg-surface hover:text-paper"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          View on explorer
        </Link>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => disconnect()}
          className="gap-2 px-4 py-2.5 font-mono text-body-sm text-fold focus:bg-surface focus:text-fold"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
