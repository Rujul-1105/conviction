import { create } from 'zustand'
import { api, type WalletInfo } from '@/lib/api'

/**
 * Wallet store.
 *
 * DESIGN.md §8: Zustand holds only client state that never goes on chain.
 * The wallet's *connection* is owned by @solana/wallet-adapter-react; this
 * store holds the game-layer profile that hangs off it (FTR balance, win rate,
 * village name) which in the real implementation comes from the FTR token
 * account and derived stats.
 */
interface WalletState {
  wallet: WalletInfo | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  /** Refresh FTR after a vote or a round win, without a full reconnect. */
  refreshBalance: () => Promise<void>
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  isConnecting: false,

  connect: async () => {
    if (get().isConnecting) return
    set({ isConnecting: true })
    try {
      const wallet = await api.connectWallet()
      set({ wallet, isConnecting: false })
    } catch {
      set({ isConnecting: false })
    }
  },

  disconnect: async () => {
    await api.disconnectWallet()
    set({ wallet: null })
  },

  refreshBalance: async () => {
    const current = get().wallet
    if (!current) return
    const ftrBalance = await api.getFTRBalance(current.address)
    set({ wallet: { ...current, ftrBalance } })
  },
}))
