'use client'

import { useEffect } from 'react'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store/wallet-store'

/**
 * Bridges the real wallet adapter to the game-layer wallet store.
 *
 * Two distinct notions of "connected" exist and conflating them causes bugs:
 *   - adapter connected  = a keypair is available to sign
 *   - store wallet       = the game profile (FTR, win rate, village) is loaded
 *
 * This hook keeps the second in sync with the first. Mount it once, in the top
 * nav, so it runs on every route.
 */
export function useWalletSync() {
  const { connected, publicKey } = useSolanaWallet()
  const { wallet, connect, disconnect } = useWalletStore()

  useEffect(() => {
    if (connected && publicKey && !wallet) {
      void connect()
    } else if (!connected && wallet) {
      void disconnect()
    }
  }, [connected, publicKey, wallet, connect, disconnect])
}

/**
 * Read-only view of the combined wallet state, for display components.
 * `address` prefers the real adapter key and falls back to the mock profile.
 */
export function useGameWallet() {
  const { connected, publicKey } = useSolanaWallet()
  const wallet = useWalletStore((s) => s.wallet)
  const isConnecting = useWalletStore((s) => s.isConnecting)

  return {
    connected,
    isConnecting,
    address: publicKey?.toBase58() ?? wallet?.address ?? null,
    ftrBalance: wallet?.ftrBalance ?? 0,
    winRate: wallet?.winRate ?? 0,
    teamName: wallet?.teamName ?? null,
  }
}
