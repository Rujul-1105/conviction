import type { Proposal, RoundEvent, SpectatorBet } from './index'
import { T0, min, sec, tok } from './mock-data'

/**
 * Mock fixtures: round events, spectator bids, proposals and the village
 * leaderboard.
 *
 * Split out of mock-data.ts to stay under the repo's 300-LOC-of-code cap.
 * mock-data.ts owns the token universe and the matches; this file owns
 * everything timestamped relative to those matches. Both share T0 so event
 * times line up with match start times.
 */

// Timestamped and dramatic. Newest first — the feed renders in array order.

function ev(
  id: string,
  agoSec: number,
  type: RoundEvent['type'],
  message: string,
  extra: Partial<RoundEvent> = {},
): RoundEvent {
  return { id, timestamp: T0 - agoSec * sec, type, message, ...extra }
}

/** Seed feeds keyed by match id. Live subscriptions prepend to these. */
export const ROUND_EVENTS: Record<string, RoundEvent[]> = {
  'live-1': [
    ev('e1-3', 12, 'price', 'WIF +1.2% — Exit Liquidity Provider edges ahead'),
    ev('e1-2', 30, 'lock_in', 'Terminal Velocity locked in 3 positions'),
    ev('e1-1', 40, 'round_start', 'Round 7 is live. 15:00 on the clock.'),
  ],
  'live-2': [
    ev('e2-6', 8, 'price', 'BOME -4.1% in 40 seconds', {
      tokenMint: tok('BOME').mint,
    }),
    ev('e2-5', 52, 'price', 'Village of Conviction crosses +4% — in the money'),
    ev('e2-4', 145, 'chaos', 'Chaos event: RUG — BOME -18% in 90 seconds', {
      tokenMint: tok('BOME').mint,
    }),
    ev('e2-3', 210, 'price', 'SOL +2.4% — majors holding while memes bleed'),
    ev('e2-2', 340, 'lock_in', 'Diamond Hand Syndicate locked in 3 positions'),
    ev('e2-1', 360, 'round_start', 'Round 7 is live. 15:00 on the clock.'),
  ],
  'live-3': [
    ev('e3-7', 20, 'price', 'MOTHER +3.8% — Unrealized Gains extends the lead'),
    ev('e3-6', 90, 'fold', 'The Paper Tigers folded at -14.3%', {
      teamId: 'paper-tigers',
    }),
    ev('e3-5', 96, 'price', 'CHILLGUY stop-loss tripped at -12%', {
      tokenMint: tok('CHILLGUY').mint,
    }),
    ev('e3-4', 240, 'chaos', 'Chaos event: FAKE NEWS — MYRO -11% and falling'),
    ev('e3-3', 430, 'chaos', 'Chaos event: PUMP — MOTHER +22% out of nowhere'),
    ev('e3-2', 760, 'lock_in', 'Both villages locked in. No going back.'),
    ev('e3-1', 780, 'round_start', 'Round 7 is live. 15:00 on the clock.'),
  ],
  'live-4': [
    ev('e4-6', 5, 'chaos', 'Chaos event: RUG — MOODENG -16% in 30 seconds', {
      tokenMint: tok('MOODENG').mint,
    }),
    ev('e4-5', 70, 'price', 'Both villages underwater. Nobody has folded.'),
    ev('e4-4', 180, 'chaos', 'Chaos event: FAKE NEWS — ACT -9%'),
    ev('e4-3', 320, 'chaos', 'Chaos event: PUMP — PONKE +14%'),
    ev('e4-2', 520, 'lock_in', 'Late To Every Pump locked in 3 positions'),
    ev('e4-1', 540, 'round_start', 'Round 7 is live. 15:00 on the clock.'),
  ],
  'ended-1': [
    ev('e5-4', 1200, 'round_end', 'Round 6 settled. Pot 22.5 SOL distributed.'),
    ev('e5-3', 1205, 'win', 'Village of Conviction wins at +6.8%'),
    ev('e5-2', 1210, 'fold', 'Diamond Hand Syndicate folded at -11.2%'),
    ev('e5-1', 2100, 'round_start', 'Round 6 is live. 15:00 on the clock.'),
  ],
}

// ─── Spectator bets ──────────────────────────────────────────────────────────

export const SPECTATOR_BETS: SpectatorBet[] = [
  {
    id: 'bet-1',
    matchId: 'live-2',
    bettorWallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    type: 'first_fold',
    prediction: 'Diamond Hand Syndicate',
    amount: 25,
    status: 'pending',
  },
  {
    id: 'bet-2',
    matchId: 'live-2',
    bettorWallet: '3nPqB8VmKcLdFvQhTxYwRsAeJgMnZuXwCvBnMkLpQrSt',
    type: 'chaos_count',
    prediction: '3 or more',
    amount: 10,
    status: 'pending',
  },
  {
    id: 'bet-3',
    matchId: 'live-3',
    bettorWallet: '5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    type: 'last_holding',
    prediction: 'Unrealized Gains',
    amount: 50,
    status: 'won',
  },
  {
    id: 'bet-4',
    matchId: 'live-3',
    bettorWallet: '7YttLkHDoNj9wyDur5pM1ejZHTUVakbrmDBBpAf9fkTV',
    type: 'perfect_round',
    prediction: 'No folds this round',
    amount: 15,
    status: 'lost',
  },
]

// ─── Governance ──────────────────────────────────────────────────────────────
// One open, one passed, one failed — so every card state is visible.

export const PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    proposerTeamId: 'team-1',
    parameter: 'duration',
    currentValue: 900,
    proposedValue: 600,
    votesYes: 1420,
    votesNo: 880,
    status: 'open',
    deadline: T0 + 42 * min,
    isPrivate: false,
  },
  {
    id: 'prop-2',
    proposerTeamId: 'team-2',
    parameter: 'chaos_count',
    currentValue: 3,
    proposedValue: 5,
    votesYes: 2610,
    votesNo: 540,
    status: 'passed',
    deadline: T0 - 2 * 60 * min,
    isPrivate: false,
  },
  {
    id: 'prop-3',
    proposerTeamId: 'team-3',
    parameter: 'penalty',
    currentValue: '10%',
    proposedValue: '35%',
    votesYes: 310,
    votesNo: 1980,
    status: 'failed',
    deadline: T0 - 5 * 60 * min,
    // Sealed via PER until tally — the UI shows a lock affordance for these.
    isPrivate: true,
  },
]

// ─── Leaderboard (lobby "Top Villages") ──────────────────────────────────────

export const TOP_VILLAGES: { name: string; ftr: number; winRate: number }[] = [
  { name: 'Village of Conviction', ftr: 4820, winRate: 0.71 },
  { name: 'Unrealized Gains', ftr: 3915, winRate: 0.66 },
  { name: 'Terminal Velocity', ftr: 2740, winRate: 0.58 },
  { name: 'Rug Resistant', ftr: 2180, winRate: 0.54 },
  { name: 'Diamond Hand Syndicate', ftr: 1960, winRate: 0.49 },
  { name: 'Exit Liquidity Provider', ftr: 1240, winRate: 0.42 },
  { name: 'The Paper Tigers', ftr: 890, winRate: 0.37 },
]

/** The connected player, for the mock wallet. */
export const MOCK_WALLET = {
  address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  ftrBalance: 1247,
  winRate: 0.62,
  teamName: 'Village of Conviction',
}
