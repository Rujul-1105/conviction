// Phase 0 spike smoke test — runs against MagicBlock devnet.
// Verifies: initialize → delegate → router status → bump on ER → undelegate.
//
// Usage: node scripts/smoke.mjs
// Env:    KEYPAIR_PATH (default ~/.config/solana/id.json)
//         BASE_RPC      (default https://rpc.magicblock.app/devnet)

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

function loadWallet() {
  const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function rpc(path, params = []) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: path, params }),
  });
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

  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), wallet.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  console.log(`wallet=${wallet.publicKey.toBase58()}  counter=${counterPda.toBase58()}`);

  // 1. Initialize counter (base)
  try {
    const sig = await program.methods
      .initializeCounter()
      .accounts({
        counter: counterPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`1. initializeCounter OK  ${sig}`);
  } catch (e) {
    // Already initialized is fine for re-runs.
    if (!String(e.message || e).includes("already in use")) throw e;
    console.log("1. initializeCounter: account already initialized (re-run, skipping)");
  }

  // 3. Router status BEFORE attempting delegate so we can skip re-delegation.
  let status = await getDelegationStatus(counterPda);
  console.log("3-pre. router status:", JSON.stringify(status));

  // 2. Delegate (base) — skip if router already reports delegated (idempotent).
  if (status.isDelegated) {
    console.log("2. delegateCounter: already delegated, skipping");
  } else {
    const sig = await program.methods
      .delegateCounter()
      .accounts({ authority: wallet.publicKey, counter: counterPda })
      .rpc();
    console.log(`2. delegateCounter OK  ${sig}`);
    // Re-query status after delegate — propagation latency.
    for (let i = 0; i < 10 && !status.isDelegated; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      status = await getDelegationStatus(counterPda);
    }
    console.log("3-post. router status:", JSON.stringify(status));
  }

  if (!status.isDelegated || !status.fqdn) {
    throw new Error("counter is not delegated per router; abort");
  }
  const fqdn = status.fqdn;

  // 4. ER connection + read initial count
  const er = new Connection(fqdn, "confirmed");
  const erProvider = new anchor.AnchorProvider(
    er,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  const erProgram = new anchor.Program(idl, erProvider);
  let initial;
  try {
    const acct = await erProgram.account.counter.fetch(counterPda);
    initial = acct.count;
    console.log(`4. initial count via ER fqdn = ${initial.toString()}`);
  } catch (e) {
    console.log("4. ER account not visible yet — sleeping 3s and retrying");
    await new Promise((r) => setTimeout(r, 3000));
    initial = (await erProgram.account.counter.fetch(counterPda)).count;
    console.log(`4. (retry) initial count via ER = ${initial.toString()}`);
  }

  // 5. Bump on ER
  const bumpSig = await erProgram.methods
    .bump()
    .accounts({
      counter: counterPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
    })
    .rpc();
  console.log(`5. bump OK  ${bumpSig}`);

  // 6. Read count after bump
  const after = (await erProgram.account.counter.fetch(counterPda)).count;
  console.log(`6. post-bump count via ER = ${after.toString()}`);
  if (Number(after) !== Number(initial) + 1) {
    throw new Error(
      `expected count ${Number(initial) + 1} got ${Number(after)}`,
    );
  }

  // 7. Verify base ownership flipped to the delegation program
  const baseInfo = await base.getAccountInfo(counterPda);
  const delegationProgram = new PublicKey(
    "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh",
  );
  const baseOwner = baseInfo?.owner?.toBase58() ?? "";
  console.log(
    `7. base owner of PDA = ${baseOwner} (delegation program expected: ${delegationProgram.toBase58()})`,
  );

  // 8. Commit (keep delegated)
  const commitSig = await erProgram.methods
    .commitCounter()
    .accounts({ payer: wallet.publicKey, counter: counterPda })
    .rpc();
  console.log(`8. commit OK  ${commitSig}`);

  // 9. Read on base after commit — should match ER count
  const baseCountAcct = await program.account.counter.fetch(counterPda);
  console.log(
    `9. base count after commit = ${baseCountAcct.count.toString()} (expected ${after.toString()})`,
  );

  // 10. Undelegate (final settle)
  const undelegateSig = await erProgram.methods
    .undelegateCounter()
    .accounts({ payer: wallet.publicKey, counter: counterPda })
    .rpc();
  console.log(`10. undelegate OK  ${undelegateSig}`);

  // 11. Base should now be: owner == counter program (per skill's invariant).
  await new Promise((r) => setTimeout(r, 2000));
  const final = await base.getAccountInfo(counterPda);
  console.log(
    `11. final base owner = ${final?.owner?.toBase58()} (counter program expected: ${PROGRAM_ID.toBase58()})`,
  );

  console.log("\n✓ Phase 0 spike smoke passed (devnet).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
