'use client'

import { useEffect, useMemo, useState } from 'react'
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { clusterApiUrl } from '@solana/web3.js'
import { Toaster } from 'sonner'

import '@solana/wallet-adapter-react-ui/styles.css'
import { setConnection, setWallet, invalidateProgram } from '@/lib/anchor/context'

/**
 * Client provider tree. Ported from the Phase 0 spike, plus Sonner for toasts.
 *
 * Order matters: ConnectionProvider must wrap WalletProvider, which must wrap
 * WalletModalProvider. React Query sits inside so hooks can read the wallet.
 *
 * Phase 3 adds `<WalletContextBridge>` — a small inner component that copies
 * the wallet-adapter's connection + signing wallet into the module-level
 * `lib/anchor/context.ts` holder so `real.ts` can build an Anchor Program
 * from anywhere in the tree.
 */

const NETWORK =
  (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) ??
  WalletAdapterNetwork.Devnet

/**
 * Prefer the MagicBlock devnet RPC — it routes to the ER as well as the base
 * layer, so one endpoint serves both. Falls back to the public cluster.
 */
function resolveEndpoint(): string {
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  }
  if (process.env.NEXT_PUBLIC_USE_LOCAL === '1') return 'http://127.0.0.1:8899'
  return clusterApiUrl(NETWORK)
}

/**
 * Inner component that runs inside ConnectionProvider + WalletProvider so
 * it can read the live connection + signing wallet and copy them into the
 * module-level context that `real.ts` reads from. Re-runs whenever either
 * dependency changes; rebuilds the cached Anchor Program on each change.
 */
function WalletContextBridge({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection()
  const { publicKey, signTransaction, signAllTransactions, connected } =
    useWallet()

  useEffect(() => {
    if (connection) setConnection(connection)
  }, [connection])

  useEffect(() => {
    if (connected && publicKey && signTransaction && signAllTransactions) {
      setWallet({
        publicKey,
        signTransaction,
        signAllTransactions,
      })
    } else {
      setWallet({
        publicKey: null,
        signTransaction: null,
        signAllTransactions: null,
      })
      invalidateProgram()
    }
  }, [connected, publicKey, signTransaction, signAllTransactions])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(resolveEndpoint, [])

  // Adapters are stateful; constructing them once per mount avoids dropping
  // an in-flight connection on re-render. Backpack arrives via Wallet Standard.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: NETWORK })],
    [],
  )

  // useState (not useMemo) so the client is never recreated — a new
  // QueryClient would drop the whole cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Round data is polled explicitly per hook; refetching on every
            // window focus would double-fire during a live round.
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 2000,
          },
        },
      }),
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <WalletContextBridge>{children}</WalletContextBridge>
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                // Match the design system: flat, bordered, 6px, no shadow.
                className:
                  'bg-surface-elevated border border-border rounded-md text-paper font-sans text-body-sm',
                style: { boxShadow: 'none' },
              }}
            />
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
