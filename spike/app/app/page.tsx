"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  getBaseConnection,
  getErConnection,
  getDelegationStatus,
  confirmUndelegateCommitment,
} from "./lib/magicblock";
import { COUNTER_IDL, COUNTER_PROGRAM_ID } from "./lib/idl";
import { counterPda, stopLossPda, getProgram } from "./lib/counter";
import { BN, Program } from "@coral-xyz/anchor";

type CounterInfo = { authority: string; count: string } | null;

export default function Page() {
  const wallet = useWallet();
  const { connection: walletConnection } = useConnection();
  const [counter, setCounter] = useState<CounterInfo>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const authority = wallet.publicKey ?? null;
  const counterAddr = useMemo(
    () => (authority ? counterPda(authority).toBase58() : ""),
    [authority],
  );

  // ------------------------------------------------------------------
  // Subscribe via the ER connection when the counter PDA is delegated.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!authority) return;
    let cancelled = false;

    async function subscribe(pda: PublicKey) {
      try {
        setStatus("Resolving delegation status…");
        const del = await getDelegationStatus(pda);
        if (!del.isDelegated) {
          setStatus(`Not delegated (router: ${del.fqdn ?? "—"}). Use the buttons above to delegate + bump.`);
          return;
        }
        setStatus(`Delegated to ${del.fqdn}`);
        const er = await getErConnection(pda, del.fqdn);

        // Subscribe to changes via ER. Keep preflight on the ER side too
        // unless we hit a known simulation incompatibility.
        const subId = er.onAccountChange(
          pda,
          (info) => {
            if (cancelled) return;
            // First 8 bytes = Anchor discriminator; skip.
            if (info.data.length < 8 + 32 + 8) {
              setStatus("Unexpected account data shape — skipping decode");
              return;
            }
            const view = new DataView(info.data.buffer, info.data.byteOffset);
            // Discriminator(8) | authority(32) | count(8)
            const authBytes = info.data.slice(8, 40);
            const countBytes = info.data.slice(40, 48);
            const count = Number(new DataView(countBytes.buffer, countBytes.byteOffset).getBigUint64(0, true));
            setCounter({
              authority: new PublicKey(authBytes).toBase58(),
              count: String(count),
            });
          },
          "confirmed",
        );

        return () => {
          er.removeAccountChangeListener(subId);
        };
      } catch (e: unknown) {
        setError(`subscription: ${(e as Error).message}`);
      }
    }

    if (!counterAddr) return;
    const handle = subscribe(new PublicKey(counterAddr));
    return () => {
      cancelled = true;
      handle?.then((cleanup) => cleanup?.());
    };
  }, [authority, counterAddr]);

  // ------------------------------------------------------------------
  // Program client built with the wallet adapter's connection; routing
  // per ix is handled by the wrappers below.
  // ------------------------------------------------------------------
  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    const provider = new AnchorProvider(
      walletConnection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: "confirmed" },
    );
    return getProgram(provider);
  }, [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, walletConnection]);

  async function handle(action: "init" | "delegate" | "bump" | "commit" | "undelegate") {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      setError("connect wallet first");
      return;
    }
    setError("");
    setStatus(`→ ${action}`);
    try {
      const baseConnection = getBaseConnection();
      const provider = new AnchorProvider(
        baseConnection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: "confirmed" },
      );
      const prog = getProgram(provider);
      const pda = counterPda(wallet.publicKey);
      const signer = wallet.publicKey;

      let ix: unknown;
      switch (action) {
        case "init":
          ix = await prog.methods
            .initializeCounter()
            .accounts({ counter: pda, authority: signer, systemProgram: SystemProgram })
            .instruction();
          break;
        case "delegate":
          ix = await prog.methods
            .delegateCounter()
            .accounts({ authority: signer, counter: pda })
            .instruction();
          break;
        case "bump": {
          // Bump goes to ER.
          const del = await getDelegationStatus(pda);
          if (!del.isDelegated || !del.fqdn) throw new Error("not delegated");
          const er = await getErConnection(pda, del.fqdn);
          const erProvider = new AnchorProvider(
            er,
            {
              publicKey: wallet.publicKey,
              signTransaction: wallet.signTransaction,
              signAllTransactions: wallet.signAllTransactions,
            },
            { commitment: "confirmed" },
          );
          const erProg = getProgram(erProvider);
          ix = await erProg.methods
            .bump()
            .accounts({ counter: pda, authority: signer, payer: signer })
            .instruction();
          // Override connection to ER for the actual send.
          return await sendIx(er, ix as TransactionInstruction, signer);
        }
        case "commit": {
          const er = await getErConnection(pda);
          ix = await prog.methods
            .commitCounter()
            .accounts({ payer: signer, counter: pda })
            .instruction();
          return await sendIx(er, ix as TransactionInstruction, signer);
        }
        case "undelegate": {
          const er = await getErConnection(pda);
          ix = await prog.methods
            .undelegateCounter()
            .accounts({ payer: signer, counter: pda })
            .instruction();
          const sig = await sendIx(er, ix as TransactionInstruction, signer);
          await confirmUndelegateCommitment(baseConnection, er, sig);
          setStatus(`undelegated; base commitment confirmed`);
          return sig;
        }
      }

      // Default path: send on base.
      return await sendIx(baseConnection, ix as TransactionInstruction, signer);
    } catch (e: unknown) {
      setError(`tx failed: ${(e as Error).message}`);
      setStatus(`✗`);
      throw e;
    }
  }

  async function sendIx(
    connection: Connection,
    ix: TransactionInstruction,
    signer: PublicKey,
  ): Promise<string> {
    if (!wallet.signTransaction) throw new Error("wallet missing signer");
    const tx = new Transaction().add(ix);
    tx.feePayer = signer;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signed.serialize());
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Stonk Battles — Phase 0 spike</h1>
        <WalletMultiButton />
      </header>

      <section style={{ marginTop: 24, padding: 16, background: "#161616", borderRadius: 12 }}>
        <p style={{ marginTop: 0, color: "#aaa" }}>ER/PER delegation + subscription smoke test</p>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: 0 }}>
          <dt style={{ color: "#888" }}>Counter PDA</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>{counterAddr || "(connect wallet)"}</dd>
          <dt style={{ color: "#888" }}>StopLoss PDA</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>
            {authority ? stopLossPda(authority).toBase58() : "(connect wallet)"}
          </dd>
          <dt style={{ color: "#888" }}>Program ID</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>{COUNTER_PROGRAM_ID}</dd>
          <dt style={{ color: "#888" }}>Count</dt>
          <dd style={{ margin: 0, fontFamily: "monospace", fontSize: 32 }}>{counter?.count ?? "—"}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!program} onClick={() => handle("init")}>1. Initialize</button>
        <button disabled={!program} onClick={() => handle("delegate")}>2. Delegate (base)</button>
        <button disabled={!program} onClick={() => handle("bump")}>3. Bump (ER)</button>
        <button disabled={!program} onClick={() => handle("commit")}>4. Commit (ER)</button>
        <button disabled={!program} onClick={() => handle("undelegate")}>5. Undelegate (ER → base)</button>
      </section>

      {status && <p style={{ marginTop: 16, color: "#9cdcfe", fontFamily: "monospace" }}>{status}</p>}
      {error && <p style={{ marginTop: 8, color: "#f48771", fontFamily: "monospace" }}>{error}</p>}

      <section style={{ marginTop: 32, padding: 16, background: "#0d0d0d", borderRadius: 12, fontSize: 14 }}>
        <h3 style={{ marginTop: 0 }}>Verification flow</h3>
        <ol style={{ lineHeight: 1.6 }}>
          <li>Initialize (one-time on base).</li>
          <li>Delegate — establishes the base-layer lock + ER clone.</li>
          <li>Bump — counter increments on the ER; UI should refresh within ~1–2s via <code>connection.onAccountChange</code> on the router fqdn.</li>
          <li>Commit — keeps delegation, settles the count to base.</li>
          <li>Undelegate — finalizes on base; commitment signature fetched via <code>GetCommitmentSignature</code>.</li>
        </ol>
      </section>
    </main>
  );
}
