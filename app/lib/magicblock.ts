import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from '@solana/web3.js'

/**
 * MagicBlock dual-connection helper.
 *
 * Ported from the Phase 0 spike (spike/app/app/lib/magicblock.ts), which was
 * validated end-to-end on devnet — router lookup, ER connection, and commitment
 * confirmation all work as written. Unused by Phase B screens (which run on
 * mocks) but kept wired and typed so lib/api/real.ts can use it directly.
 *
 * The model: writes and reads for a DELEGATED account must go to that
 * account's Ephemeral Rollup endpoint, not to the base L1 RPC. The router
 * tells us which ER holds a given account, and that assignment can rotate —
 * so never cache an FQDN across a session without re-checking.
 */

export const ROUTER_ENDPOINT =
  process.env.NEXT_PUBLIC_ROUTER_ENDPOINT || 'https://devnet-router.magicblock.app/'

export const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://rpc.magicblock.app/devnet'

export type DelegationStatus = {
  isDelegated: boolean
  fqdn?: string
  authority?: string
  owner?: string
  delegationSlot?: number
  lamports?: number
}

/** Shared base-layer connection. */
export function getBaseConnection(): Connection {
  return new Connection(BASE_RPC_URL, 'confirmed')
}

/**
 * Ask the router whether an account is delegated, and to which ER.
 * Returns `{ isDelegated: false }` rather than throwing on a router error, so
 * callers can degrade to base-layer reads.
 */
export async function getDelegationStatus(
  account: PublicKey,
): Promise<DelegationStatus> {
  try {
    const response = await fetch(ROUTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getDelegationStatus',
        params: [account.toBase58()],
      }),
    })
    if (!response.ok) return { isDelegated: false }

    const json = (await response.json()) as {
      result?: {
        isDelegated?: boolean
        fqdn?: string
        authority?: string
        owner?: string
        delegationSlot?: number
        lamports?: number
      }
      error?: unknown
    }
    if (json.error || !json.result) return { isDelegated: false }

    return {
      isDelegated: Boolean(json.result.isDelegated),
      fqdn: json.result.fqdn,
      authority: json.result.authority,
      owner: json.result.owner,
      delegationSlot: json.result.delegationSlot,
      lamports: json.result.lamports,
    }
  } catch {
    // Network failure is not a program error — let the caller fall back.
    return { isDelegated: false }
  }
}

/**
 * Build a Connection to the ER that currently holds `pda`.
 * Pass a known `fqdn` to skip the router round-trip.
 * Throws if the account isn't delegated — there is no ER to talk to.
 */
export async function getErConnection(
  pda: PublicKey,
  fqdn?: string,
): Promise<Connection> {
  const status = fqdn
    ? { isDelegated: true, fqdn }
    : await getDelegationStatus(pda)

  if (!status.isDelegated || !status.fqdn) {
    throw new Error('Account is not delegated; cannot build ER connection')
  }
  return new Connection(status.fqdn, 'confirmed')
}

/**
 * Subscribe to an account on its ER, resolving the endpoint first.
 * Returns an unsubscribe function; safe to call even if setup failed.
 *
 * This is the primitive lib/api/real.ts needs for subscribeToRound, since the
 * program emits no events and account diffs are the only realtime signal.
 *
 * TODO: recheck on rotation. The router can rotate a delegated account to a
 * different ER FQDN mid-round; this primitive resolves once at setup and
 * never re-checks. Phase 9 should add a 30s router-poll + resubscribe loop.
 * Phase 8 demos don't see rotation (sticky ER for round lifetime) so this
 * is acceptable deferral, not a blocker.
 */
export async function subscribeToDelegatedAccount(
  pda: PublicKey,
  onChange: (data: Buffer, slot: number) => void,
): Promise<() => void> {
  let cancelled = false
  let connection: Connection | null = null
  let subId: number | null = null

  try {
    connection = await getErConnection(pda)
    if (cancelled) return () => {}
    subId = connection.onAccountChange(
      pda,
      (info, ctx) => onChange(info.data, ctx.slot),
      'confirmed',
    )
  } catch {
    // Not delegated yet, or the ER is unreachable. Caller keeps last-known state.
    return () => {
      cancelled = true
    }
  }

  return () => {
    cancelled = true
    if (connection && subId !== null) {
      void connection.removeAccountChangeListener(subId)
    }
  }
}

/**
 * Subscribe to multiple PDAs on their respective ERs in one call.
 *
 * The onChange callback fires once per diff, with the PDA that fired. A
 * single Solana tx often writes several PDAs in the same slot (e.g. a fold
 * updates both Match and Team); the caller should debounce.
 *
 * Returns an aggregate unsubscribe; safe to call even if some PDAs fail
 * to set up (those return noops internally).
 */
export async function subscribeToDelegatedAccounts(
  pdas: PublicKey[],
  onChange: (pda: PublicKey, data: Buffer, slot: number) => void,
): Promise<() => void> {
  const results = await Promise.all(
    pdas.map((pda) =>
      subscribeToDelegatedAccount(pda, (data, slot) => onChange(pda, data, slot)),
    ),
  )
  return () => {
    for (const unsub of results) unsub()
  }
}

/**
 * Build + sign + send a multi-ix transaction through the ER that currently
 * holds `representativePda`. Atomic across all ixs: a Solana `Transaction`
 * reverts the whole batch if any ix fails — this is the "intent bundle"
 * semantics that lives in bare Solana without needing a missing SDK helper.
 *
 * `skipPreflight: true` because PER (Private Ephemeral Rollups) is
 * semi-trusted and the simulation adds latency without surfacing real
 * errors. `maxRetries: 3` forgives transient 429/5xx from the ER.
 */
export async function sendErBundle(args: {
  representativePda: PublicKey
  ixs: TransactionInstruction[]
  wallet: {
    publicKey: PublicKey
    signTransaction: (tx: Transaction) => Promise<Transaction>
  }
  computeUnits?: number
}): Promise<string> {
  const {
    representativePda,
    ixs,
    wallet,
    computeUnits = 1_400_000,
  } = args

  const conn = await getErConnection(representativePda)

  const tx = new Transaction()
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }))
  for (const ix of ixs) tx.add(ix)

  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  tx.feePayer = wallet.publicKey
  const signed = await wallet.signTransaction(tx)
  return await conn.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  })
}
