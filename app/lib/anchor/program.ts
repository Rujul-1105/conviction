import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection } from '@solana/web3.js'
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