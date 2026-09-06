/**
 * TypeScript PER wrappers — calls the program's permission ixs on the ER.
 * Mirrors the Rust-side `Create/Update/CloseEphemeralPermissionCpi` calls.
 *
 * Program-side handlers:
 *   - init_stop_loss_permission
 *   - update_stop_loss_permission
 *   - close_stop_loss_permission
 *
 * Authority model: the stop_loss PDA itself signs the permission CPI (PDA seeds).
 * The transaction fee payer may be either that PDA's delegate-pay wallet or the
 * authority wallet.
 */

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";

export type MemberArg = {
  pubkey: PublicKey;
  flags: number;
};

const PERMISSION_SEED = Buffer.from("permission:");
const PERMISSION_PROGRAM_ID = new PublicKey("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");
const EPHEMERAL_VAULT_ID = new PublicKey(
  "MagicVau1t999999999999999999999999999999999",
);
const MAGIC_PROGRAM_ID = new PublicKey("Magic11111111111111111111111111111111111111");

function permissionPda(stopLossPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [PERMISSION_SEED, stopLossPda.toBuffer()],
    PERMISSION_PROGRAM_ID,
  );
  return pda;
}

export async function initStopLossPermission(
  program: Program,
  authority: PublicKey,
  stopLossPda: PublicKey,
  members: MemberArg[],
): Promise<string> {
  const ix = await program.methods
    .initStopLossPermission(members.map((m) => ({ pubkey: m.pubkey, flags: m.flags })))
    .accounts({
      authority,
      stopLoss: stopLossPda,
      permission: permissionPda(stopLossPda),
      permissionProgram: PERMISSION_PROGRAM_ID,
      ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  // tx submission is wired by caller
  return ix as unknown as string;
}

export async function updateStopLossPermission(
  program: Program,
  authority: PublicKey,
  stopLossPda: PublicKey,
  members: MemberArg[],
): Promise<string> {
  const ix = await program.methods
    .updateStopLossPermission(members.map((m) => ({ pubkey: m.pubkey, flags: m.flags })))
    .accounts({
      authority,
      stopLoss: stopLossPda,
      permission: permissionPda(stopLossPda),
      permissionProgram: PERMISSION_PROGRAM_ID,
      ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return ix as unknown as string;
}

export async function closeStopLossPermission(
  program: Program,
  authority: PublicKey,
  stopLossPda: PublicKey,
): Promise<string> {
  const ix = await program.methods
    .closeStopLossPermission()
    .accounts({
      authority,
      stopLoss: stopLossPda,
      permission: permissionPda(stopLossPda),
      permissionProgram: PERMISSION_PROGRAM_ID,
      ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return ix as unknown as string;
}

export const PER_CONSTANTS = {
  PERMISSION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_PROGRAM_ID,
};
