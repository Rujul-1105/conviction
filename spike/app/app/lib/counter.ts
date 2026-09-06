/**
 * Counter / StopLoss helpers — PDA derivation and shared program builder.
 */

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import { COUNTER_IDL, COUNTER_PROGRAM_ID } from "./idl";

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

export function getProgram(provider: AnchorProvider): Program {
  return new Program(COUNTER_IDL, provider);
}

export function findErByConnection(connection: Connection): Connection {
  return connection;
}
