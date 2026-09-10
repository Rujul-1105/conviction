'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { Footer } from '@/components/layout/footer'
import { TopNav } from '@/components/layout/top-nav'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { shortAddress } from '@/lib/utils'

/**
 * Connect screen (DESIGN.md §10 priority 2).
 *
 * Opens the wallet-adapter modal (Phantom / Solflare / any Wallet Standard
 * wallet such as Backpack) and warns if the RPC endpoint isn't devnet — the
 * program only exists there, so a mainnet wallet would fail confusingly.
 */
export default function ConnectPage() {
  const router = useRouter()
  const { setVisible } = useWalletModal()
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const { teamName } = useGameWallet()

  // Endpoint check is a string match rather than a getGenesisHash() call: it's
  // synchronous, and a wrong-cluster URL is the actual failure mode we've seen.
  const endpoint = connection.rpcEndpoint
  const isDevnet = /devnet|localhost|127\.0\.0\.1/i.test(endpoint)

  // Once connected on the right cluster, get out of the way.
  useEffect(() => {
    if (connected && isDevnet) {
      const t = setTimeout(() => router.push('/lobby'), 600)
      return () => clearTimeout(t)
    }
  }, [connected, isDevnet, router])

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md p-6">
          <PanelLabel>Step 1 of 1</PanelLabel>
          <h1 className="mt-2 font-display text-heading-md font-bold text-paper">
            Connect a wallet
          </h1>
          <p className="mt-2 text-body-md text-text-muted">
            Conviction runs on Solana devnet. Your wallet signs lock-ins, folds
            and votes — nothing is custodial.
          </p>

          {!isDevnet && (
            // Chaos yellow is correct here: a transient warning, not an error.
            <div className="mt-4 flex gap-3 rounded-md border border-chaos/30 bg-chaos/10 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-chaos" />
              <div className="text-body-sm">
                <p className="text-chaos">Switch to devnet</p>
                <p className="mt-1 font-mono text-text-muted">{endpoint}</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            {connected && publicKey ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-conviction/30 bg-conviction/10 px-3 py-2">
                  <span className="text-body-sm text-conviction">Connected</span>
                  <span className="font-mono tabular-nums text-body-sm text-paper">
                    {shortAddress(publicKey.toBase58())}
                  </span>
                </div>
                {teamName && (
                  <p className="text-body-sm text-text-muted">
                    Playing as <span className="text-paper">{teamName}</span>
                  </p>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/lobby')}
                >
                  Enter the lobby
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setVisible(true)}
              >
                Select wallet
              </Button>
            )}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
