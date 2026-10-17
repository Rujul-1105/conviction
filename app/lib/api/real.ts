import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import {
  findBasketPda,
  findConfigPda,
  findMatchPda,
  findProposalPda,
  findStopLossPda,
  findTeamPda,
  findVillainPda,
} from '@/lib/anchor/pda'
import {
  getCurrentConnection,
  getCurrentProgram,
  getCurrentWallet,
  invalidateProgram,
} from '@/lib/anchor/context'
import { buildReadProgram } from '@/lib/anchor/program'
import { sendErBundle, subscribeToDelegatedAccounts } from '@/lib/magicblock'
import { TOKENS, tokenByMint } from './mock-data'
import type {
  Basket,
  ConvictionApi,
  Match,
  Proposal,
  RoundEvent,
  SpectatorBet,
  StopLossBand,
  Team,
  Token,
  WalletInfo,
} from './index'

/**
 * Real (on-chain) implementation — wired against `EvuchyGQK…` on devnet.
 *
 * Loose-typed throughout: the IDL JSON is huge, and Anchor's intricate
 * generics aren't worth fighting for an MVP wire-up. The runtime shape is
 * verified by `anchor build` + IDL regen.
 *
 * Things that are intentionally simplified for the MVP:
 *  - `lockInPicks` builds a two-phase sequence (idempotent PER init + atomic
 *    4-ix bundle via `sendErBundle`) so any failure in the lock step reverts
 *    the whole bundle. See the per-method comment for the exact contract.
 *  - `subscribeToRound` reads via ER `onAccountChange` on Match + Team×2;
 *    the program emits no events so account diffs are the only signal.
 *  - `placeBet` / `getSpectatorBets` stay client-side — on-chain bidding
 *    was dropped in Phase B+2; spectator realtime uses mock fixtures.
 *  - P&L is derived from `Match.last_prices_e6` weighted by the team's
 *    basket weights vs. cached entry prices; see `lib/pnl.ts`.
 */

const notWired = (what: string): never => {
  throw new Error(`real.ts: ${what} is not wired in this build`)
}

function requireWallet(): { publicKey: PublicKey } {
  const w = getCurrentWallet()
  if (!w.publicKey) throw new Error('Wallet not connected')
  return { publicKey: w.publicKey }
}

/**
 * Minimal on-chain shapes — only what real.ts reads. The actual IDL has
 * more fields; these interfaces declare the ones we touch.
 */
type AnchorMatchPhase = {
  created?: Record<string, never>
  lockedIn?: Record<string, never>
  live?: Record<string, never>
  revealed?: Record<string, never>
  finalized?: Record<string, never>
}

type AnchorTeamMember = {
  player: PublicKey
  basketPda: PublicKey
  stopLossPda: PublicKey
}

type AnchorTeam = {
  matchId: number
  side: number
  leader: PublicKey
  members: AnchorTeamMember[]
  alive: number
  folded: boolean
  bump: number
}

type AnchorMatch = {
  matchId: number
  authority: PublicKey
  teams: PublicKey[]
  pot: BN
  phase: AnchorMatchPhase
  deadlineSlot: BN
  villainPubkey: PublicKey | null
  chaosCount: number
  bump: number
  lastPricesE6: [BN, BN, BN]
  lastMint: [PublicKey, PublicKey, PublicKey]
}

type AnchorVillainPick = {
  matchPubkey: PublicKey
  villainMint: PublicKey
  randomness: number[]
  fulfilledAtSlot: BN
}

function phaseToStatus(p: AnchorMatchPhase): Match['status'] {
  if (p.created || p.lockedIn) return 'forming'
  if (p.live) return 'live'
  return 'ended'
}

function teamStatusFromAnchor(
  alive: number,
  folded: boolean,
): Team['status'] {
  if (folded) return 'folded'
  if (alive === 0) return 'folded'
  return 'holding'
}

function bnToSol(bn: BN): number {
  // Lamports → SOL.
  return bn.toNumber() / 1e9
}

function anchorMatchToUi(am: AnchorMatch, teams: Team[]): Match {
  return {
    id: String(am.matchId),
    roundNumber: am.matchId,
    mode: 'classic',
    tier: 'mixed',
    pot: bnToSol(am.pot),
    duration: 15 * 60,
    teams,
    status: phaseToStatus(am.phase),
    villainTokenMint: am.villainPubkey
      ? am.villainPubkey.toBase58()
      : undefined,
    chaosEventCount: am.chaosCount,
    spectatorCount: 0,
    // Mirror the on-chain per-slot latest-price array. Used by `useTeamPnl`
    // to derive weighted P&L against each viewer's cached entry prices.
    lastPricesE6: [
      am.lastPricesE6[0].toNumber(),
      am.lastPricesE6[1].toNumber(),
      am.lastPricesE6[2].toNumber(),
    ],
  }
}

function anchorTeamToUi(
  at: AnchorTeam,
  matchId: number,
  side: number,
): Team {
  return {
    id: `${matchId}-${side}`,
    name: side === 0 ? 'Village of Conviction' : 'Diamond Hand Syndicate',
    walletAddresses: at.members.map((m) => m.player.toBase58()),
    pnl: 0,
    status: teamStatusFromAnchor(at.alive, at.folded),
    foldTime: undefined,
    worstPerformerMint: undefined,
  }
}

// Associated Token Account derivation — manual, avoids the @solana/spl-token
// dependency. Source: solana-program / spl-associated-token-account.
const ATA_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
)
const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
)

function findAta(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ATA_PROGRAM_ID,
  )
  return ata
}

export const realApi: ConvictionApi = {
  // ─── Wallet ────────────────────────────────────────────────────────────────

  async connectWallet(): Promise<WalletInfo> {
    const w = requireWallet()
    const ftr = await realApi.getFTRBalance(w.publicKey.toBase58())
    return {
      address: w.publicKey.toBase58(),
      connected: true,
      ftrBalance: ftr,
      winRate: 0,
      teamName: 'Village of Conviction',
    }
  },

  async disconnectWallet() {
    // No-op; wallet-adapter handles UI state.
  },

  // ─── Matchmaking ───────────────────────────────────────────────────────────

  async getOpenMatches(): Promise<Match[]> {
    // Try the cached signed program first; fall back to a read-only Program
    // so lobby reads work pre-wallet. Either way, honest empty-state on a
    // genuinely empty chain — no cinematic fallback.
    const program = (getCurrentProgram() as any) ?? buildReadProgram(getCurrentConnection())
    try {
      const all = (await program.account.match.all()) as Array<{
        account: AnchorMatch
      }>
      return all
        .filter(({ account }) =>
          Boolean(account.phase.created || account.phase.lockedIn),
        )
        .map(({ account }) => anchorMatchToUi(account, []))
    } catch (err) {
      console.error('[getOpenMatches] program.account.match.all failed', err)
      throw err
    }
  },

  async getLiveMatches(): Promise<Match[]> {
    const program = (getCurrentProgram() as any) ?? buildReadProgram(getCurrentConnection())
    try {
      const all = (await program.account.match.all()) as Array<{
        account: AnchorMatch
      }>
      return all
        .filter(({ account }) => Boolean(account.phase.live))
        .map(({ account }) => anchorMatchToUi(account, []))
    } catch (err) {
      console.error('[getLiveMatches] program.account.match.all failed', err)
      throw err
    }
  },

  async getMatch(id: string): Promise<Match> {
    const matchId = Number(id)
    const program = (getCurrentProgram() as any) ?? buildReadProgram(getCurrentConnection())
    try {
      const am = (await program.account.match.fetch(
        findMatchPda(matchId),
      )) as AnchorMatch
      const [t0, t1] = await Promise.all([
        program.account.team
          .fetch(findTeamPda(matchId, 0))
          .catch(() => null),
        program.account.team
          .fetch(findTeamPda(matchId, 1))
          .catch(() => null),
      ])
      const teams: Team[] = []
      if (t0) teams.push(anchorTeamToUi(t0 as AnchorTeam, matchId, 0))
      if (t1) teams.push(anchorTeamToUi(t1 as AnchorTeam, matchId, 1))
      return anchorMatchToUi(am, teams)
    } catch {
      // No on-chain match at this PDA. The verbatim error string keeps
      // `mission-control.tsx:74-83` ("Round is no longer on the ledger.")
      // empty-state copy aligned.
      throw new Error('Round is no longer on the ledger.')
    }
  },

  async createMatch(params): Promise<Match> {
    const program = getCurrentProgram() as any
    if (!program) throw new Error('Wallet not connected')
    const wallet = requireWallet()

    // match_id derivation: read the singleton RoundCounter PDA's
    // `currentRound` (camelCased by Anchor from `current_round`) and
    // add 1. Fall back to 1 if the counter is not yet initialised
    // (client-side safety; the on-chain `init_if_needed` will create
    // it on the very first call regardless).
    let matchId = 1
    try {
      const counters = (await program.account.roundCounter.all()) as Array<{
        account: { currentRound: BN }
      }>
      const last = counters[counters.length - 1]
      if (last) matchId = last.account.currentRound.toNumber() + 1
    } catch (err) {
      console.warn('[createMatch] roundCounter fetch failed; using matchId=1', err)
    }

    const pot = new BN(Math.floor((params.pot ?? 1) * 1e9))
    const sig = await program.methods
      .createMatch(matchId, pot)
      .accounts({ authority: wallet.publicKey })
      .rpc()
    console.log('[createMatch] tx', sig, 'matchId', matchId)
    return {
      id: String(matchId),
      roundNumber: matchId,
      mode: (params.mode as Match['mode']) ?? 'classic',
      tier: (params.tier as Match['tier']) ?? 'wild',
      pot: params.pot ?? 1,
      duration: params.duration ?? 15 * 60,
      teams: [],
      status: 'forming',
      chaosEventCount: 0,
      spectatorCount: 0,
      ...params,
    }
  },

  async joinMatch(id: string): Promise<void> {
    const program = getCurrentProgram() as any
    const w = requireWallet()
    if (!program) throw new Error('Wallet not connected')
    const matchId = Number(id)
    const am = (await program.account.match.fetch(
      findMatchPda(matchId),
    )) as AnchorMatch
    const emptySide = am.teams.findIndex((pk) => pk.equals(PublicKey.default))
    if (emptySide < 0) throw new Error('Match is full')
    await program.methods
      .registerTeam(
        matchId,
        emptySide,
        [
          {
            player: w.publicKey,
            basketPda: PublicKey.default,
            stopLossPda: PublicKey.default,
          },
        ],
      )
      .accounts({})
      .rpc()
  },

  async leaveMatch(id: string): Promise<void> {
    const program = getCurrentProgram() as any
    const w = requireWallet()
    if (!program) throw new Error('Wallet not connected')
    const matchId = Number(id)
    const teamPdas = [findTeamPda(matchId, 0), findTeamPda(matchId, 1)]
    for (let side = 0; side < 2; side += 1) {
      try {
        const team = (await program.account.team.fetch(
          teamPdas[side],
        )) as AnchorTeam
        const isMember = team.members.some((m) => m.player.equals(w.publicKey))
        if (isMember) {
          await program.methods
            .leaveMatch(matchId, side)
            .accounts({})
            .rpc()
          return
        }
      } catch {
        // empty side; skip
      }
    }
  },

  // ─── Pre-round ─────────────────────────────────────────────────────────────

  async setBasket(_matchId, _basket: Basket): Promise<void> {
    // Local-only — wizard state lives in Zustand; consumed at lockInPicks.
  },

  async setStopLosses(_matchId, _band: StopLossBand): Promise<void> {
    // Local-only.
  },

  async lockInPicks(matchId: string): Promise<void> {
    const program = getCurrentProgram() as any
    const w = requireWallet()
    if (!program) throw new Error('Wallet not connected')
    const id = Number(matchId)

    // Find which side the player is on.
    const teamPdas = [findTeamPda(id, 0), findTeamPda(id, 1)]
    let side = -1
    for (let s = 0; s < 2; s += 1) {
      try {
        const team = (await program.account.team.fetch(
          teamPdas[s],
        )) as AnchorTeam
        if (team.members.some((m) => m.player.equals(w.publicKey))) {
          side = s
          break
        }
      } catch {
        // empty
      }
    }
    if (side < 0) throw new Error('Player is not registered on either team')

    const basketState = readPendingBasket(id)
    const basketPda = findBasketPda(id, side, w.publicKey)
    const stopLossPda = findStopLossPda(id, side, w.publicKey)

    // Phase A — PER init (idempotent).
    // The `init_*_permission` ixs are only meaningful once the Basket/StopLoss
    // PDAs exist (they read `per_members` from those accounts). On a fresh
    // lock-in the Basket PDA is created in Phase B, so Phase A is a no-op;
    // on a re-lock (or if the bootstrap script pre-created them) Phase A
    // runs and creates the permission PDAs. Any failure here is treated as
    // benign — Phase B is the atomic guarantee that the lock step lands.
    await sendIfNeeded(
      () => program.methods
        .initBasketPermission()
        .accounts({ player: w.publicKey })
        .rpc(),
      'initBasketPermission',
    )
    await sendIfNeeded(
      () => program.methods
        .initStopLossPermission()
        .accounts({ player: w.publicKey })
        .rpc(),
      'initStopLossPermission',
    )

    // Phase B — atomic bundle.
    // All three ixs sign by the player wallet. A Solana `Transaction` is
    // atomic across its ixs: if any ix fails the whole bundle reverts and
    // the match never enters `LockedIn` phase. This closes the half-state
    // window where `lockInPreRound` could succeed but `delegateBasket`
    // could fail, leaving the Basket un-delegated to the ER.
    const lockIx = await program.methods
      .lockInPreRound(
        id,
        side,
        basketState.mints,
        basketState.weights,
        { minBps: basketState.band.minBps, maxBps: basketState.band.maxBps },
        new Array(8).fill(PublicKey.default),
        new Array(8).fill(0),
        0,
      )
      .accounts({})
      .instruction()
    const delegateBasketIx = await program.methods
      .delegateBasket(id, side)
      .accounts({})
      .instruction()
    const delegateStopLossIx = await program.methods
      .delegateStopLoss(id, side)
      .accounts({})
      .instruction()

    await sendErBundle({
      representativePda: basketPda,
      ixs: [lockIx, delegateBasketIx, delegateStopLossIx],
      wallet: w as any,
    })

    // The cached Program (Anchor coder + account subscriptions) is stale
    // after we wrote new accounts; clear it so the next read picks up the
    // new layout (Basket/StopLoss now delegated, Match now LockedIn).
    invalidateProgram()

    // Quiet the linter on unused-vars stopLossPda — it's documented for the
    // Bundle PDA trace but the bundle keys off basketPda alone.
    void basketPda
    void stopLossPda
  },

  // ─── Live round ────────────────────────────────────────────────────────────

  async getRound(matchId: string): Promise<{ match: Match; events: RoundEvent[] }> {
    const match = await realApi.getMatch(matchId)
    return { match, events: [] }
  },

  async fold(matchId: string): Promise<void> {
    const program = getCurrentProgram() as any
    const w = requireWallet()
    if (!program) throw new Error('Wallet not connected')
    const id = Number(matchId)
    const teamPdas = [findTeamPda(id, 0), findTeamPda(id, 1)]
    for (let s = 0; s < 2; s += 1) {
      try {
        const team = (await program.account.team.fetch(
          teamPdas[s],
        )) as AnchorTeam
        const isMember =
          team.leader.equals(w.publicKey) ||
          team.members.some((m) => m.player.equals(w.publicKey))
        if (isMember) {
          await program.methods.fold(id, s).accounts({}).rpc()
          return
        }
      } catch {
        // skip
      }
    }
    throw new Error('Player is not on either team')
  },

  async getLeaderboard(matchId: string): Promise<Team[]> {
    const { match } = await realApi.getRound(matchId)
    // P&L is DERIVED from Match.last_prices_e6 vs basket entry; for the MVP
    // rank by `alive` only — folded teams sink to the bottom.
    return [...match.teams].sort((a, b) => {
      const aFolded = a.status === 'folded' ? 1 : 0
      const bFolded = b.status === 'folded' ? 1 : 0
      if (aFolded !== bFolded) return aFolded - bFolded
      return b.pnl - a.pnl
    })
  },

  subscribeToRound(matchId: string, cb: (event: RoundEvent) => void): () => void {
    // ER `onAccountChange` over Match + Team×2 — the canonical subscribe set
    // (PLAN.md:203). The program emits no events so account diffs are the
    // only realtime signal. A 250ms debounce collapses a 3-PDA burst (a
    // single tx often writes Match + both Teams) into one getRound refetch
    // and event emission. Setup is async — the API contract stays sync by
    // absorbing the Promise internally; screens keep their sync subscribe
    // shape.
    const id = Number(matchId)
    let unsubs: Array<() => void> = []
    let cancelled = false
    let debounce: number | undefined

    void (async () => {
      try {
        const unsubscribeAll = await subscribeToDelegatedAccounts(
          [findMatchPda(id), findTeamPda(id, 0), findTeamPda(id, 1)],
          () => {
            if (debounce !== undefined) window.clearTimeout(debounce)
            debounce = window.setTimeout(() => {
              void (async () => {
                try {
                  const round = await realApi.getRound(matchId)
                  const last = round.match.teams[0]
                  if (!last) return
                  cb({
                    id: `er-${Date.now()}`,
                    timestamp: Date.now(),
                    type: 'price',
                    teamId: last.id,
                    message: `${last.name} holding at ${last.pnl.toFixed(1)}%`,
                  })
                } catch {
                  // Match not on chain (yet); skip.
                }
              })()
            }, 250)
          },
        )
        if (cancelled) unsubscribeAll()
        else unsubs.push(unsubscribeAll)
      } catch {
        // Router unreachable / no PDAs delegated; silent noop.
      }
    })()

    return () => {
      cancelled = true
      for (const u of unsubs) u()
      if (debounce !== undefined) window.clearTimeout(debounce)
    }
  },

  // ─── Spectator ─────────────────────────────────────────────────────────────

  async getSpectatorBets(_matchId): Promise<SpectatorBet[]> {
    // On-chain bidding dropped in Phase B+2; spectator realtime uses mocks.
    return []
  },

  async placeBet(_matchId, _bet): Promise<void> {
    // No on-chain path; spectator page subscribes via mock fixtures.
  },

  // ─── Governance ────────────────────────────────────────────────────────────

  async getFTRBalance(wallet: string): Promise<number> {
    const program = getCurrentProgram() as any
    if (!program) return 0
    try {
      const cfg = (await program.account.gameConfig.fetch(
        findConfigPda(),
      )) as { ftrMint: PublicKey }
      const ata = findAta(cfg.ftrMint, new PublicKey(wallet))
      const connection = getCurrentConnection()
      const bal = await connection.getTokenAccountBalance(ata)
      return Number(bal.value.uiAmount ?? 0)
    } catch {
      return 0
    }
  },

  async getProposals(): Promise<Proposal[]> {
    const program = getCurrentProgram() as any
    if (!program) return []
    try {
      const all = (await program.account.proposal.all()) as Array<{
        account: {
          paramName: number[]
          newValue: BN
          status: { open?: object; tallied?: object }
        }
        publicKey: PublicKey
      }>
      return all.map(({ account, publicKey }) => {
        const nameBytes = account.paramName
        const paramName = String.fromCharCode(...nameBytes).replace(
          /\0+$/,
          '',
        )
        return {
          id: publicKey.toBase58().slice(0, 8),
          proposerTeamId: 'team-1',
          parameter: 'duration',
          currentValue: '900',
          proposedValue: account.newValue.toNumber(),
          votesYes: 0,
          votesNo: 0,
          status: account.status.open ? 'open' : 'passed',
          deadline: Date.now() + 86_400_000,
          isPrivate: false,
        } as Proposal
      })
    } catch {
      return []
    }
  },

  async createProposal(p): Promise<Proposal> {
    const program = getCurrentProgram() as any
    if (!program) throw new Error('Wallet not connected')
    const proposalId = Math.floor(Math.random() * 1e6)
    const paramName = new TextEncoder().encode(
      p.parameter.padEnd(32, '\0').slice(0, 32),
    )
    const newValue = Number(p.proposedValue) || 0
    await program.methods
      .proposeParamChange(
        proposalId,
        Array.from(paramName) as unknown as number[],
        newValue,
      )
      .accounts({})
      .rpc()
    return {
      ...p,
      id: String(proposalId),
      votesYes: 0,
      votesNo: 0,
      status: 'open',
    }
  },

  async vote(proposalId: string, support): Promise<void> {
    const program = getCurrentProgram() as any
    if (!program) throw new Error('Wallet not connected')
    const id = Number(proposalId)
    await program.methods
      .voteOnProposal(id, support === 'yes')
      .accounts({})
      .rpc()
  },

  // ─── Tokens ────────────────────────────────────────────────────────────────

  async getTokenUniverse(): Promise<Token[]> {
    // Local — the 25-token universe lives in tokens.json. Prices decorated
    // by Birdeye in Phase 4.
    return TOKENS.map((t) => ({ ...t }))
  },

  async getVillainToken(matchId: string): Promise<Token | null> {
    const program = getCurrentProgram() as any
    if (!program) return null
    const id = Number(matchId)
    try {
      const vp = (await program.account.villainPick.fetch(
        findVillainPda(findMatchPda(id)),
      )) as AnchorVillainPick
      const mint = vp.villainMint.toBase58()
      return tokenByMint(mint) ?? null
    } catch {
      return null
    }
  },
}

/**
 * Reads the player's pending basket from the round-store Zustand instance.
 * Returns safe defaults when the wizard hasn't been completed yet.
 */
function readPendingBasket(_matchId: number): {
  mints: [PublicKey, PublicKey, PublicKey]
  weights: [number, number, number]
  band: { minBps: number; maxBps: number }
} {
  // Late import keeps this helper side-effect-free at module load.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useRoundUIStore } = require('@/lib/store/round-store') as {
    useRoundUIStore: {
      getState: () => {
        selectedBasketTokens: string[]
        basketStopLossBand: { minBps: number; maxBps: number }
      }
    }
  }
  const s = useRoundUIStore.getState()
  const mints: [PublicKey, PublicKey, PublicKey] = [
    new PublicKey(s.selectedBasketTokens[0] ?? PublicKey.default.toBase58()),
    new PublicKey(s.selectedBasketTokens[1] ?? PublicKey.default.toBase58()),
    new PublicKey(s.selectedBasketTokens[2] ?? PublicKey.default.toBase58()),
  ]
  return {
    mints,
    weights: [3333, 3333, 3334],
    band: s.basketStopLossBand,
  }
}

export { readPendingBasket }

/**
 * Try-send a setup ix. Used by Phase A of `lockInPicks` where the ixs are
 * idempotent (the program rejects `init` on an existing account) and the
 * caller wants to continue regardless of the outcome. The only signal we
 * carry forward is whether the call reached the chain at all — log it so
 * operators can see why a re-lock might have skipped the permission init.
 */
async function sendIfNeeded(
  send: () => Promise<string>,
  label: string,
): Promise<void> {
  try {
    await send()
  } catch (err) {
    console.warn(
      `[lockInPicks] ${label} skipped:`,
      err instanceof Error ? err.message : err,
    )
  }
}