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
import {
  ALL_MATCHES,
  LIVE_MATCHES,
  OPEN_MATCHES,
  TOKENS,
  tok,
  tokenByMint,
} from './mock-data'
import {
  MOCK_WALLET,
  PROPOSALS,
  ROUND_EVENTS,
  SPECTATOR_BETS,
} from './mock-fixtures'

/**
 * Mock implementation of the api contract.
 *
 * State is module-level and mutable so that actions taken in one screen are
 * visible in the next (fold on /live, see it on /reveal). That is intentional
 * for a demo — it resets on reload, which is the desired behaviour.
 */

/** Simulated network latency. Enough to exercise loading states, not annoy. */
const latency = (ms = 120) => new Promise((r) => setTimeout(r, ms))

// Mutable copies so mock mutations (fold, join, vote) persist within a session.
const matches: Match[] = ALL_MATCHES.map((m) => ({ ...m, teams: [...m.teams] }))
const proposals: Proposal[] = PROPOSALS.map((p) => ({ ...p }))
const bets: SpectatorBet[] = SPECTATOR_BETS.map((b) => ({ ...b }))
const events: Record<string, RoundEvent[]> = Object.fromEntries(
  Object.entries(ROUND_EVENTS).map(([k, v]) => [k, [...v]]),
)

let wallet: WalletInfo = { ...MOCK_WALLET, connected: false }

/** Pending basket/stop-loss selections, keyed by match id, pre-lock-in. */
const pendingBaskets: Record<string, Basket> = {}

function findMatch(id: string): Match {
  const m = matches.find((x) => x.id === id)
  if (!m) throw new Error(`Match not found: ${id}`)
  return m
}

/** Which team the connected player belongs to in a given match. */
function playerTeam(match: Match): Team | undefined {
  return match.teams.find((t) => t.name === wallet.teamName) ?? match.teams[0]
}

let eventSeq = 1000
function nextEventId() {
  eventSeq += 1
  return `gen-${eventSeq}`
}

/**
 * Price-tick generator for the live subscription.
 *
 * Drifts each team's P&L by a small random amount and emits a narrated event.
 * Biased slightly negative because a chicken game is more interesting when
 * positions bleed — that pressure is the whole point of the round.
 */
function tickRound(matchId: string): RoundEvent | null {
  const match = matches.find((m) => m.id === matchId)
  if (!match || match.status !== 'live') return null

  const live = match.teams.filter((t) => t.status === 'holding')
  if (live.length === 0) return null

  const team = live[Math.floor(Math.random() * live.length)]
  const basketTokens = team.basket?.tokens ?? []
  const token =
    basketTokens[Math.floor(Math.random() * basketTokens.length)] ?? TOKENS[0]

  // Volatility scales with tier — moonshots swing hardest.
  const amplitude = token.tier === 'moonshot' ? 2.4 : token.tier === 'wild' ? 1.4 : 0.6
  const delta = (Math.random() - 0.55) * amplitude
  team.pnl = Math.round((team.pnl + delta) * 10) / 10

  // Track the worst position so the reveal screen has something to show.
  if (delta < 0) team.worstPerformerMint = token.mint

  // Auto-fold when the basket P&L breaches the basket band's floor.
  const band = team.basket?.band
  if (band && team.pnl <= band.minBps / 100) {
    team.status = 'folded'
    team.foldTime = Date.now()
    return {
      id: nextEventId(),
      timestamp: Date.now(),
      type: 'fold',
      teamId: team.id,
      tokenMint: token.mint,
      message: `${team.name} auto-folded — basket crossed the ${band.minBps / 100}% floor`,
    }
  }

  const dir = delta >= 0 ? '+' : ''
  return {
    id: nextEventId(),
    timestamp: Date.now(),
    type: 'price',
    teamId: team.id,
    tokenMint: token.mint,
    message: `${token.symbol} ${dir}${delta.toFixed(2)}% — ${team.name} at ${team.pnl > 0 ? '+' : ''}${team.pnl.toFixed(1)}%`,
  }
}

export const mockApi: ConvictionApi = {
  // ─── Wallet ────────────────────────────────────────────────────────────────

  async connectWallet() {
    await latency(300)
    wallet = { ...wallet, connected: true }
    return { ...wallet }
  },

  async disconnectWallet() {
    await latency(80)
    wallet = { ...wallet, connected: false }
  },

  // ─── Matchmaking ───────────────────────────────────────────────────────────

  async getOpenMatches() {
    await latency()
    return matches.filter((m) => m.status === 'forming').map((m) => ({ ...m }))
  },

  async getLiveMatches() {
    await latency()
    return matches.filter((m) => m.status === 'live').map((m) => ({ ...m }))
  },

  async getMatch(id) {
    await latency()
    return { ...findMatch(id) }
  },

  async createMatch(params) {
    await latency(400)
    const created: Match = {
      id: `open-${matches.length + 1}`,
      roundNumber: 7,
      mode: params.mode ?? 'classic',
      tier: params.tier ?? 'wild',
      pot: params.pot ?? 5,
      duration: params.duration ?? 15 * 60,
      teams: [],
      status: 'forming',
      chaosEventCount: 0,
      spectatorCount: 0,
      ...params,
    }
    matches.push(created)
    return { ...created }
  },

  async joinMatch(id) {
    await latency(300)
    const match = findMatch(id)
    // Join the smaller side, or open a new one if there's room.
    if (match.teams.length < 2) {
      match.teams.push({
        id: `team-joined-${match.teams.length + 1}`,
        name: wallet.teamName,
        walletAddresses: [wallet.address],
        pnl: 0,
        status: 'forming',
      })
    } else {
      const smaller = match.teams.reduce((a, b) =>
        a.walletAddresses.length <= b.walletAddresses.length ? a : b,
      )
      if (!smaller.walletAddresses.includes(wallet.address)) {
        smaller.walletAddresses.push(wallet.address)
      }
    }
  },

  async leaveMatch(id) {
    await latency(200)
    const match = findMatch(id)
    for (const t of match.teams) {
      t.walletAddresses = t.walletAddresses.filter((a) => a !== wallet.address)
    }
    match.teams = match.teams.filter((t) => t.walletAddresses.length > 0)
  },

  // ─── Pre-round ─────────────────────────────────────────────────────────────

  async setBasket(matchId, basket) {
    await latency(150)
    pendingBaskets[matchId] = basket
  },

  async setStopLosses(matchId, band: StopLossBand) {
    await latency(150)
    const existing = pendingBaskets[matchId]
    pendingBaskets[matchId] = { tokens: existing?.tokens ?? [], band }
  },

  async lockInPicks(matchId) {
    await latency(500)
    const match = findMatch(matchId)
    const team = playerTeam(match)
    if (team) {
      team.basket = pendingBaskets[matchId] ?? team.basket
      team.status = 'holding'
    }
    // Lock-in starts the round in the mock — the demo needs it to go live.
    if (match.status === 'forming') {
      match.status = 'live'
      match.startTime = Date.now()
      match.endTime = Date.now() + match.duration * 1000
      for (const t of match.teams) {
        if (t.status === 'forming' || t.status === 'ready') t.status = 'holding'
      }
    }
    const feed = (events[matchId] ??= [])
    feed.unshift({
      id: nextEventId(),
      timestamp: Date.now(),
      type: 'lock_in',
      teamId: team?.id,
      message: `${team?.name ?? 'A village'} locked in. No going back.`,
    })
  },

  // ─── Live round ────────────────────────────────────────────────────────────

  async getRound(matchId) {
    await latency()
    return {
      match: { ...findMatch(matchId) },
      events: [...(events[matchId] ?? [])],
    }
  },

  async fold(matchId) {
    await latency(300)
    const match = findMatch(matchId)
    const team = playerTeam(match)
    if (!team || team.status === 'folded') return
    team.status = 'folded'
    team.foldTime = Date.now()
    const feed = (events[matchId] ??= [])
    feed.unshift({
      id: nextEventId(),
      timestamp: Date.now(),
      type: 'fold',
      teamId: team.id,
      message: `${team.name} folded at ${team.pnl > 0 ? '+' : ''}${team.pnl.toFixed(1)}%`,
    })
  },

  async getLeaderboard(matchId) {
    await latency()
    // Highest P&L first; folded teams sink below anyone still holding.
    return [...findMatch(matchId).teams].sort((a, b) => {
      const aFolded = a.status === 'folded' ? 1 : 0
      const bFolded = b.status === 'folded' ? 1 : 0
      if (aFolded !== bFolded) return aFolded - bFolded
      return b.pnl - a.pnl
    })
  },

  subscribeToRound(matchId, cb) {
    // 3s cadence per DESIGN.md §5 — mimics ER account-change latency.
    const id = setInterval(() => {
      const event = tickRound(matchId)
      if (!event) return
      const feed = (events[matchId] ??= [])
      feed.unshift(event)
      // Keep the feed bounded so long demos don't grow without limit.
      if (feed.length > 60) feed.length = 60
      cb(event)
    }, 3000)
    return () => clearInterval(id)
  },

  // ─── Spectator ─────────────────────────────────────────────────────────────

  async getSpectatorBets(matchId) {
    await latency()
    return bets.filter((b) => b.matchId === matchId).map((b) => ({ ...b }))
  },

  async placeBet(matchId, bet) {
    await latency(400)
    bets.push({
      ...bet,
      id: `bet-${bets.length + 1}`,
      matchId,
      bettorWallet: wallet.address,
      status: 'pending',
    })
    const match = matches.find((m) => m.id === matchId)
    if (match) match.spectatorCount += 1
  },

  // ─── Governance ────────────────────────────────────────────────────────────

  async getFTRBalance(_wallet) {
    await latency(80)
    return wallet.ftrBalance
  },

  async getProposals() {
    await latency()
    return proposals.map((p) => ({ ...p }))
  },

  async createProposal(p) {
    await latency(400)
    const created: Proposal = {
      ...p,
      id: `prop-${proposals.length + 1}`,
      votesYes: 0,
      votesNo: 0,
      status: 'open',
    }
    proposals.unshift(created)
    return { ...created }
  },

  async vote(proposalId, support, isPrivate) {
    await latency(300)
    const p = proposals.find((x) => x.id === proposalId)
    if (!p || p.status !== 'open') return
    // Votes are FTR-weighted, so the player's whole balance goes one way.
    if (support === 'yes') p.votesYes += wallet.ftrBalance
    else p.votesNo += wallet.ftrBalance
    if (isPrivate) p.isPrivate = true
  },

  // ─── Tokens ────────────────────────────────────────────────────────────────

  async getTokenUniverse(): Promise<Token[]> {
    await latency(80)
    return TOKENS.map((t) => ({ ...t }))
  },

  async getVillainToken(matchId) {
    await latency()
    const match = matches.find((m) => m.id === matchId)
    // Villain stays sealed until the round ends — VRF result is hidden.
    if (!match?.villainTokenMint) return null
    return tokenByMint(match.villainTokenMint) ?? null
  },
}

/** Re-exported so screens can read the curated universe synchronously. */
export { TOKENS, LIVE_MATCHES, OPEN_MATCHES, tok, tokenByMint }
