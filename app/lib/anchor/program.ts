import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import idlJson from '@/lib/idl/conviction.json'

/**
 * Program ID + Anchor Program factory.
 *
 * Loose-typed to avoid fighting Anchor's intricate IDL generics; the runtime
 * shape matches the IDL emitted from `anchor build`.
 */

export const PROGRAM_ID = (idlJson as { address: string }).address

/**
 * Construct an Anchor Program instance.
 * Pass `connection` for the RPC endpoint and `wallet` from
 * `@solana/wallet-adapter-react` for signing.
 */
export function getProgram(
  connection: Connection,
  wallet: AnchorProvider['wallet'],
): Program {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  return new Program(idlJson as unknown as Idl, provider)
}

/**
 * Construct a read-only Program instance.
 *
 * Used by the API layer's no-wallet read paths (lobby, leaderboard) so that
 * `program.coder.accounts.decode(...)` is reachable without a signer. The
 * throwaway wallet will reject any signing attempt with an obvious error —
 * callers must guard writes behind `getCurrentWallet()` first.
 */
export function buildReadProgram(connection: Connection): Program {
  const throwaway = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error('buildReadProgram: read-only Program cannot sign')
    },
    signAllTransactions: async () => {
      throw new Error('buildReadProgram: read-only Program cannot sign')
    },
  } as unknown as AnchorProvider['wallet']
  const provider = new AnchorProvider(connection, throwaway, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  return new Program(idlJson as unknown as Idl, provider)
}