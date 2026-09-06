/**
 * Dual-connection factory for base layer, ER router, and the dynamic ER FQDN.
 *
 * Connection policy:
 *   - delegate (base)                  → baseConnection
 *   - account operations on ER         → erConnection (fqdn from router)
 *   - committing/undelegating          → erConnection
 *
 * Reference: ~/.claude/skills/magicblock/references/typescript-setup.md
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
} from "@magicblock-labs/ephemeral-rollups-sdk";

export const ROUTER_ENDPOINT =
  process.env.NEXT_PUBLIC_ROUTER_ENDPOINT || "https://devnet-router.magicblock.app/";

export const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "http://127.0.0.1:8899";

export type DelegationStatus = {
  isDelegated: boolean;
  fqdn?: string;
  authority?: string;
  owner?: string;
  delegationSlot?: number;
  lamports?: number;
};

/**
 * Base layer connection — used for `delegate` and for verifying ownership.
 */
export function getBaseConnection(): Connection {
  return new Connection(BASE_RPC_URL, "confirmed");
}

/**
 * Query the router for delegation status. Returns isDelegated + fqdn.
 * Routing rules require using fqdn for ER reads/transactions.
 */
export async function getDelegationStatus(account: PublicKey): Promise<DelegationStatus> {
  const response = await fetch(ROUTER_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getDelegationStatus",
      params: [account.toBase58()],
    }),
  });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "router error");
  return body.result as DelegationStatus;
}

/**
 * Build an ER connection for a delegated account. If `fqdn` is provided, use it
 * directly; otherwise fetch from the router first. Throws when the account is
 * not currently delegated.
 */
export async function getErConnection(pda: PublicKey, fqdn?: string): Promise<Connection> {
  const status = fqdn ? { isDelegated: true, fqdn } : await getDelegationStatus(pda);
  if (!status.isDelegated || !status.fqdn) {
    throw new Error("Account is not delegated; cannot build ER connection");
  }
  return new Connection(status.fqdn, "confirmed");
}

/**
 * Debug invariant: base ownership should switch to the delegation program
 * after delegate, and revert to the original program after undelegate.
 */
export function baseOwnerShowsDelegated(accountOwner: PublicKey): boolean {
  return accountOwner.equals(DELEGATION_PROGRAM_ID);
}

/**
 * After an ER undelegate, the ER transaction references an inner base signature
 * that must be confirmed separately on the base layer.
 */
export async function confirmUndelegateCommitment(
  baseConnection: Connection,
  erConnection: Connection,
  erTxSig: string,
): Promise<void> {
  const commitSig = await GetCommitmentSignature(erTxSig, erConnection);
  if (!commitSig) return;
  const bh = await baseConnection.getLatestBlockhash();
  await baseConnection.confirmTransaction(
    { signature: commitSig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
    "confirmed",
  );
}
