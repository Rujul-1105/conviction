/**
 * THE CONTRACT.
 *
 * Every type and every data-access function the UI is allowed to use lives
 * here (DESIGN.md §3, §4). Screens call `api.X()` and never touch Anchor,
 * web3.js or fetch directly — that indirection is what lets the mock layer be
 * swapped for the real program without touching a single component.
 *
 * Do not refactor this interface. It is deliberately flat and slightly verbose.
 */

// ─── Wallet ──────────────────────────────────────────────────────────────────

export type WalletInfo = {
  address: string
  connected: boolean
  ftrBalance: number
  winRate: number
  teamName: string
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

/** Risk tiers drive the pre-round token grid filter and match tier matching. */
export type TokenTier = 'safe' | 'wild' | 'moonshot'

export type Token = {
  mint: string
  symbol: string
  name: string
  decimals: number
  tier: TokenTier
  currentPrice: number
  priceChange24h: number
  logoUrl?: string
}

// ─── Game ────────────────────────────────────────────────────────────────────

/** `thresholdPct` is negative: -8 means "fold if this drops 8%". */
export type StopLoss = {
  tokenMint: string
  thresholdPct: number
}

export type Basket = {
  tokens: Token[]
  stopLosses: StopLoss[]
}

export type TeamStatus = 'forming' | 'ready' | 'holding' | 'folded' | 'won'

export type Team = {
  id: string
  name: string
  walletAddresses: string[]
  basket?: Basket
  /** Percentage, not a ratio: -8.1 renders as "-8.1%". */
  pnl: number
  status: TeamStatus
  /** Unix ms. Only set once the team has folded. */
  foldTime?: number
  worstPerformerMint?: string
}

export type MatchMode = 'classic' | 'reverse' | 'contrarian' | 'coop'
export type MatchStatus = 'forming' | 'live' | 'ended'

export type Match = {
  id: string
  roundNumber: number
  mode: MatchMode
  tier: TokenTier | 'mixed'
  /** SOL. */
  pot: number
  /** Seconds. */
  duration: number
  teams: Team[]
  status: MatchStatus
  startTime?: number
  endTime?: number
  /** Hidden until reveal — VRF-selected. */
  villainTokenMint?: string
  chaosEventCount: number
  spectatorCount: number
}

export type RoundEventType =
  | 'round_start'
  | 'round_end'
  | 'fold'
  | 'chaos'
  | 'price'
  | 'win'
  | 'team_join'
  | 'lock_in'

export type RoundEvent = {
  id: string
  timestamp: number
  type: RoundEventType
  teamId?: string
  tokenMint?: string
  message: string
  data?: Record<string, unknown>
}

// ─── Spectator ───────────────────────────────────────────────────────────────

export type SpectatorBetType =
  | 'first_fold'
  | 'last_holding'
  | 'chaos_count'
  | 'perfect_round'
  | 'player_specific'

export type SpectatorBet = {
  id: string
  matchId: string
  bettorWallet: string
  type: SpectatorBetType
  prediction: string
  /** USDC. */
  amount: number
  status: 'pending' | 'won' | 'lost'
}

// ─── Governance ──────────────────────────────────────────────────────────────

export type ProposalParameter =
  | 'duration'
  | 'pot'
  | 'penalty'
  | 'chaos_count'
  | 'token_universe'
  | 'mode'

export type ProposalStatus = 'open' | 'passed' | 'failed' | 'executed'

export type Proposal = {
  id: string
  proposerTeamId: string
  parameter: ProposalParameter
  currentValue: string | number
  proposedValue: string | number
  /** FTR-weighted, not a headcount. */
  votesYes: number
  votesNo: number
  status: ProposalStatus
  deadline: number
  isPrivate: boolean
}

// ─── API surface ─────────────────────────────────────────────────────────────

/**
 * The full data-access surface. `mock.ts` implements it today; `real.ts` will
 * implement it against the Anchor program. Both must satisfy this type, which
 * is what guarantees screens keep working across the swap.
 */
export type ConvictionApi = {
  // Wallet
  connectWallet: () => Promise<WalletInfo>
  disconnectWallet: () => Promise<void>

  // Matchmaking
  getOpenMatches: () => Promise<Match[]>
  getLiveMatches: () => Promise<Match[]>
  getMatch: (id: string) => Promise<Match>
  createMatch: (params: Partial<Match>) => Promise<Match>
  joinMatch: (id: string) => Promise<void>
  leaveMatch: (id: string) => Promise<void>

  // Pre-round
  setBasket: (matchId: string, basket: Basket) => Promise<void>
  setStopLosses: (matchId: string, stopLosses: StopLoss[]) => Promise<void>
  lockInPicks: (matchId: string) => Promise<void>

  // Live round
  getRound: (matchId: string) => Promise<{ match: Match; events: RoundEvent[] }>
  fold: (matchId: string) => Promise<void>
  getLeaderboard: (matchId: string) => Promise<Team[]>
  /** Returns an unsubscribe function. */
  subscribeToRound: (matchId: string, cb: (event: RoundEvent) => void) => () => void

  // Spectator
  getSpectatorBets: (matchId: string) => Promise<SpectatorBet[]>
  placeBet: (
    matchId: string,
    bet: Omit<SpectatorBet, 'id' | 'bettorWallet' | 'status'>,
  ) => Promise<void>

  // Governance
  getFTRBalance: (wallet: string) => Promise<number>
  getProposals: () => Promise<Proposal[]>
  createProposal: (
    p: Omit<Proposal, 'id' | 'votesYes' | 'votesNo' | 'status'>,
  ) => Promise<Proposal>
  vote: (proposalId: string, support: 'yes' | 'no', isPrivate: boolean) => Promise<void>

  // Tokens
  getTokenUniverse: () => Promise<Token[]>
  getVillainToken: (matchId: string) => Promise<Token | null>
}

import { mockApi } from './mock'

/**
 * The single api instance the whole app imports.
 *
 * Phase B ships on mocks. See lib/api/real.ts for why the program can't back
 * these calls yet and what each one maps to when it can.
 */
export const api: ConvictionApi = mockApi
