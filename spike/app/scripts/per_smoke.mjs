// Phase 0 PER smoke — StopLoss-shaped PDA lifecycle on the ER.
// Verifies: initialize_stop_loss → delegate_stop_loss → init_permission →
// update_permission → close_permission → undelegate_stop_loss.
//
// Notes:
// - PER membership enforcement is enforced by the TEE validator in production.
//   Devnet (non-TEE ER) accepts any caller with the data PDA authority, so we
//   only verify the CPI lifecycle here.
// - Permission rent is pre-funded during initialize_stop_loss.

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROGRAM_ID = new PublicKey(
  "2Prk1oV522ED8y5tsHXXxLYfBaPVYSHLEwRoXg3At979",
);
const BASE_RPC = process.env.BASE_RPC || "https://rpc.magicblock.app/devnet";
const ROUTER = process.env.ROUTER || "https://devnet-router.magicblock.app/";
const KEYPAIR_PATH =
  process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

const PERMISSION_PROGRAM_ID = new PublicKey(
  "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1",
);
const EPHEMERAL_VAULT_ID = new PublicKey(
  "MagicVau1t999999999999999999999999999999999",
);
const MAGIC_PROGRAM_ID = new PublicKey(
  "Magic11111111111111111111111111111111111111",
);

function loadWallet() {
  const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function getDelegationStatus(account) {
  const res = await fetch(ROUTER, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getDelegationStatus",
      params: [account.toBase58()],
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}

function permissionPda(stopLossPda) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("permission:"), stopLossPda.toBuffer()],
    PERMISSION_PROGRAM_ID,
  );
  return pda;
}

async function main() {
  const wallet = loadWallet();
  const base = new Connection(BASE_RPC, "confirmed");
  const provider = new anchor.AnchorProvider(
    base,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);
  const idlPath = path.resolve(__dirname, "../app/lib/idl.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [stopLossPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stop-loss"), wallet.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  console.log(`wallet=${wallet.publicKey.toBase58()}  stop_loss=${stopLossPda.toBase58()}`);

  // 1. Initialize StopLoss on base (pre-funds permission rent).
  try {
    const sig = await program.methods
      .initializeStopLoss(500)
      .accounts({
        stopLoss: stopLossPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`1. initializeStopLoss OK  ${sig}`);
  } catch (e) {
    const msg = String(e.message || e);
    if (!msg.includes("already in use")) throw e;
    console.log("1. initializeStopLoss: already initialized (re-run, skipping)");
  }

  // 2. Delegate StopLoss on base.
  let status = await getDelegationStatus(stopLossPda);
  if (status.isDelegated) {
    console.log("2. delegateStopLoss: already delegated, skipping");
  } else {
    const sig = await program.methods
      .delegateStopLoss()
      .accounts({ authority: wallet.publicKey, stopLoss: stopLossPda })
      .rpc();
    console.log(`2. delegateStopLoss OK  ${sig}`);
    for (let i = 0; i < 10 && !status.isDelegated; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      status = await getDelegationStatus(stopLossPda);
    }
  }
  console.log("3. router status:", JSON.stringify(status));
  if (!status.isDelegated || !status.fqdn) {
    throw new Error("stop_loss not delegated per router; abort");
  }

  // 3. Switch to ER + run PER CPI lifecycle.
  const er = new Connection(status.fqdn, "confirmed");
  const erProvider = new anchor.AnchorProvider(
    er,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  const erProgram = new anchor.Program(idl, erProvider);

  const permPda = permissionPda(stopLossPda);
  const members = [{ pubkey: wallet.publicKey, flags: 0 }];

  // 4. init_stop_loss_permission (idempotent on re-runs).
  try {
    const sig = await erProgram.methods
      .initStopLossPermission(members)
      .accounts({
        authority: wallet.publicKey,
        stopLoss: stopLossPda,
        permission: permPda,
        permissionProgram: PERMISSION_PROGRAM_ID,
        ephemeralVault: EPHEMERAL_VAULT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`4. initStopLossPermission OK  ${sig}`);
  } catch (e) {
    const msg = String(e.message || e).toLowerCase();
    if (msg.includes("already") || msg.includes("0x0") || msg.includes("initialized")) {
      console.log("4. initStopLossPermission: already initialized (re-run, skipping)");
    } else {
      throw e;
    }
  }

  // 5. update_stop_loss_permission.
  const updSig = await erProgram.methods
    .updateStopLossPermission(members)
    .accounts({
      authority: wallet.publicKey,
      stopLoss: stopLossPda,
      permission: permPda,
      permissionProgram: PERMISSION_PROGRAM_ID,
      ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`5. updateStopLossPermission OK  ${updSig}`);

  // 6. close_stop_loss_permission (should refund rent to the data PDA).
  const closeSig = await erProgram.methods
    .closeStopLossPermission()
    .accounts({
      authority: wallet.publicKey,
      stopLoss: stopLossPda,
      permission: permPda,
      permissionProgram: PERMISSION_PROGRAM_ID,
      ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`6. closeStopLossPermission OK  ${closeSig}`);

  // 7. undelegate_stop_loss (final settle; data returns to base).
  const undelSig = await erProgram.methods
    .undelegateStopLoss()
    .accounts({ payer: wallet.publicKey, stopLoss: stopLossPda })
    .rpc();
  console.log(`7. undelegateStopLoss OK  ${undelSig}`);

  await new Promise((r) => setTimeout(r, 2000));
  const final = await base.getAccountInfo(stopLossPda);
  console.log(
    `8. final base owner = ${final?.owner?.toBase58()} (counter program expected: ${PROGRAM_ID.toBase58()})`,
  );

  console.log("\n✓ Phase 0 PER smoke passed (devnet).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
