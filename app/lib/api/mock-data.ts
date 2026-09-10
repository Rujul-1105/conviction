import tokensJson from '@/tokens.json'
import type { Basket, Match, Team, Token, TokenTier } from './index'

/**
 * Mock data — the token universe and the matches.
 *
 * DESIGN.md §5: this data IS the pitch, so it is authored to tell a story
 * rather than to be uniform. Three open matches at different fill levels, four
 * live matches at different dramatic stages, teams with personality, and a
 * leaderboard that visibly moves.
 *
 * Round events, spectator bids, proposals and the village leaderboard live in
 * mock-fixtures.ts, which keeps both files under the 300-LOC cap.
 *
 * Timestamps are computed relative to module load so the demo always looks
 * "live" no matter when it runs.
 */

/** Token universe, loaded from the curated 25-SPL list. */
export const TOKENS: Token[] = tokensJson.tokens as Token[]

const byMint = new Map(TOKENS.map((t) => [t.mint, t]))
const bySymbol = new Map(TOKENS.map((t) => [t.symbol, t]))

/** Look up a token by symbol; throws loudly so a typo fails at import time. */
export function tok(symbol: string): Token {
  const t = bySymbol.get(symbol)
  if (!t) throw new Error(`Unknown token symbol in mock data: ${symbol}`)
  return t
}

export function tokenByMint(mint: string): Token | undefined {
  return byMint.get(mint)
}

/**
 * Module load time — all relative timestamps anchor to this.
 * Exported so mock-fixtures.ts shares the same origin; two independent Date.now()
 * baselines would make event times drift against match start times.
 */
export const T0 = Date.now()
export const sec = 1000
export const min = 60 * sec

/** Build a basket from symbols plus a single bps stop-loss band. */
function basket(
  symbols: string[],
  band: { minBps: number; maxBps: number },
): Basket {
  const tokens = symbols.map(tok)
  return { tokens, band }
}

let teamSeq = 0
/** Team factory. Keeps the match definitions below readable. */
function team(
  name: string,
  pnl: number,
  status: Team['status'],
  opts: {
    wallets?: number
    basket?: Basket
    foldTime?: number
    worstPerformerMint?: string
  } = {},
): Team {
  teamSeq += 1
  const wallets = opts.wallets ?? 3
  return {
    id: `team-${teamSeq}`,
    name,
    // Deterministic pseudo-addresses: readable in the UI, stable across renders.
    walletAddresses: Array.from(
      { length: wallets },
      (_, i) => `${name.replace(/\W/g, '').slice(0, 4)}${teamSeq}${i}xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`.slice(0, 44),
    ),
    basket: opts.basket,
    pnl,
    status,
    foldTime: opts.foldTime,
    worstPerformerMint: opts.worstPerformerMint,
  }
}

// ─── Open matches ────────────────────────────────────────────────────────────
// One filling fast, one starting soon, one empty (invites the player to create).

export const OPEN_MATCHES: Match[] = [
  {
    id: 'open-1',
    roundNumber: 7,
    mode: 'classic',
    tier: 'wild',
    pot: 12.4,
    duration: 15 * 60,
    // Filling fast: 2 of 2 slots on side A, side B nearly ready.
    teams: [
      team('Village of Conviction', 0, 'ready', { wallets: 3 }),
      team('Diamond Hand Syndicate', 0, 'forming', { wallets: 2 }),
    ],
    status: 'forming',
    startTime: T0 + 45 * sec,
    chaosEventCount: 0,
    spectatorCount: 38,
  },
  {
    id: 'open-2',
    roundNumber: 7,
    mode: 'contrarian',
    tier: 'moonshot',
    pot: 24.0,
    duration: 15 * 60,
    teams: [team('The Paper Tigers', 0, 'ready', { wallets: 3 })],
    status: 'forming',
    startTime: T0 + 4 * min,
    chaosEventCount: 0,
    spectatorCount: 12,
  },
  {
    id: 'open-3',
    roundNumber: 7,
    mode: 'coop',
    tier: 'safe',
    pot: 5.0,
    duration: 10 * 60,
    teams: [],
    status: 'forming',
    chaosEventCount: 0,
    spectatorCount: 3,
  },
]

// ─── Live matches ────────────────────────────────────────────────────────────
// Four stages: just started, mid-round with movement, near end, chaos firing.

export const LIVE_MATCHES: Match[] = [
  {
    // Just started — everything still near flat.
    id: 'live-1',
    roundNumber: 7,
    mode: 'classic',
    tier: 'wild',
    pot: 18.2,
    duration: 15 * 60,
    teams: [
      team('Exit Liquidity Provider', 0.4, 'holding', {
        basket: basket(['WIF', 'BONK', 'POPCAT'], { minBps: -1200, maxBps: -300 }),
      }),
      team('Terminal Velocity', -0.2, 'holding', {
        basket: basket(['PNUT', 'MEW', 'GOAT'], { minBps: -1500, maxBps: -400 }),
      }),
    ],
    status: 'live',
    startTime: T0 - 40 * sec,
    endTime: T0 - 40 * sec + 15 * min,
    chaosEventCount: 0,
    spectatorCount: 64,
  },
  {
    // Mid-round: the leaderboard has real spread. This is the demo default.
    id: 'live-2',
    roundNumber: 7,
    mode: 'classic',
    tier: 'mixed',
    pot: 31.6,
    duration: 15 * 60,
    teams: [
      team('Village of Conviction', 4.2, 'holding', {
        basket: basket(['SOL', 'JUP', 'WIF'], { minBps: -1400, maxBps: -500 }),
      }),
      team('Diamond Hand Syndicate', -8.1, 'holding', {
        basket: basket(['BOME', 'SLERF', 'GIGA'], { minBps: -2000, maxBps: -600 }),
        worstPerformerMint: tok('BOME').mint,
      }),
    ],
    status: 'live',
    startTime: T0 - 6 * min,
    endTime: T0 - 6 * min + 15 * min,
    chaosEventCount: 1,
    spectatorCount: 217,
  },
  {
    // Near the end — one side already folded, so the result is nearly locked.
    id: 'live-3',
    roundNumber: 7,
    mode: 'reverse',
    tier: 'moonshot',
    pot: 44.8,
    duration: 15 * 60,
    teams: [
      team('Unrealized Gains', 11.7, 'holding', {
        basket: basket(['MOTHER', 'FWOG', 'SLERF'], { minBps: -2500, maxBps: -800 }),
      }),
      team('The Paper Tigers', -14.3, 'folded', {
        basket: basket(['CHILLGUY', 'MYRO', 'BOME'], { minBps: -1800, maxBps: -500 }),
        foldTime: T0 - 90 * sec,
        worstPerformerMint: tok('CHILLGUY').mint,
      }),
    ],
    status: 'live',
    startTime: T0 - 13 * min,
    endTime: T0 - 13 * min + 15 * min,
    chaosEventCount: 2,
    spectatorCount: 489,
  },
  {
    // Chaos happening right now — max chaos count, both sides bleeding.
    id: 'live-4',
    roundNumber: 7,
    mode: 'contrarian',
    tier: 'wild',
    pot: 27.3,
    duration: 15 * 60,
    teams: [
      team('Rug Resistant', -3.8, 'holding', {
        basket: basket(['BONK', 'WEN', 'PONKE'], { minBps: -1400, maxBps: -400 }),
      }),
      team('Late To Every Pump', -6.9, 'holding', {
        basket: basket(['ACT', 'MOODENG', 'GOAT'], { minBps: -1200, maxBps: -300 }),
        worstPerformerMint: tok('MOODENG').mint,
      }),
    ],
    status: 'live',
    startTime: T0 - 9 * min,
    endTime: T0 - 9 * min + 15 * min,
    chaosEventCount: 3,
    spectatorCount: 312,
  },
]

// ─── Ended match (for the reveal screen) ─────────────────────────────────────

export const ENDED_MATCHES: Match[] = [
  {
    id: 'ended-1',
    roundNumber: 6,
    mode: 'classic',
    tier: 'mixed',
    pot: 22.5,
    duration: 15 * 60,
    teams: [
      team('Village of Conviction', 6.8, 'won', {
        basket: basket(['SOL', 'JTO', 'PNUT'], { minBps: -1200, maxBps: -400 }),
      }),
      team('Diamond Hand Syndicate', -11.2, 'folded', {
        basket: basket(['BOME', 'GIGA', 'MYRO'], { minBps: -2000, maxBps: -700 }),
        foldTime: T0 - 20 * min,
        worstPerformerMint: tok('GIGA').mint,
      }),
    ],
    status: 'ended',
    startTime: T0 - 35 * min,
    endTime: T0 - 20 * min,
    villainTokenMint: tok('GIGA').mint,
    chaosEventCount: 2,
    spectatorCount: 356,
  },
]

export const ALL_MATCHES: Match[] = [
  ...OPEN_MATCHES,
  ...LIVE_MATCHES,
  ...ENDED_MATCHES,
]

/** Tier filter helper shared by the token grid. */
export function tokensForTier(tier: TokenTier | 'mixed'): Token[] {
  if (tier === 'mixed') return TOKENS
  return TOKENS.filter((t) => t.tier === tier)
}
