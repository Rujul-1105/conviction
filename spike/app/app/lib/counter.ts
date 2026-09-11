/**
 * Counter / StopLoss helpers — PDA derivation and shared program builder.
 *
 * `getProgram` requires a pre-loaded IDL; page.tsx calls `loadIdl()` once on
 * mount (see app/lib/idl.ts) and passes the result in.
 */

import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import { COUNTER_PROGRAM_ID } from "./idl";

export function counterPda(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    new PublicKey(COUNTER_PROGRAM_ID),
  );
  return pda;
}

export function stopLossPda(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stop-loss"), authority.toBuffer()],
    new PublicKey(COUNTER_PROGRAM_ID),
  );
  return pda;
}

export function getProgram(idl: Idl, provider: AnchorProvider): Program {
  return new Program(idl, provider);
}

export function findErByConnection(connection: Connection): Connection {
  return connection;
}
