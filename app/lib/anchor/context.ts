import type { AnchorProvider } from '@coral-xyz/anchor'
import type { Connection, PublicKey } from '@solana/web3.js'
import { getBaseConnection } from '@/lib/magicblock'
import { getProgram } from './program'
import idlJson from '@/lib/idl/conviction.json'

/**
 * Live context for the on-chain api layer.
 *
 * `real.ts` needs a `Connection`, a signing wallet, and the connected
 * `PublicKey` to call program methods. These come from the wallet-adapter
 * provider tree — which only exists inside the React tree — so we keep a
 * module-level mutable holder and refresh it from `Providers` on every
 * relevant wallet-adapter change.
 *
 * Falls back to a base-layer Connection when nothing is connected yet, so
 * pre-wallet reads (lobby, leaderboard) can fetch public state without
 * throwing.
 */

export type WalletCtx = {
  publicKey: PublicKey | null
  signTransaction: AnchorProvider['wallet']['signTransaction'] | null
  signAllTransactions:
    | AnchorProvider['wallet']['signAllTransactions']
    | null
}

let connection: Connection = getBaseConnection()
let wallet: WalletCtx = {
  publicKey: null,
  signTransaction: null,
  signAllTransactions: null,
}

export function setConnection(c: Connection) {
  connection = c
  cachedProgram = null
}

export function setWallet(w: WalletCtx) {
  wallet = w
  cachedProgram = null
}

export function getCurrentConnection(): Connection {
  return connection
}

export function getCurrentWallet(): WalletCtx {
  return wallet
}

export const PROGRAM_ID = (idlJson as { address: string }).address

let cachedProgram: ReturnType<typeof getProgram> | null = null

/**
 * Lazily build (and cache) an Anchor Program instance using the current
 * connection + wallet. Returns `null` if no wallet is connected.
 */
export function getCurrentProgram(): ReturnType<typeof getProgram> | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null
  }
  if (cachedProgram) return cachedProgram

  cachedProgram = getProgram(connection, {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as AnchorProvider['wallet'])
  return cachedProgram
}

export function invalidateProgram() {
  cachedProgram = null
}