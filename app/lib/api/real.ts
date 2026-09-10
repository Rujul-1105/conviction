import type { ConvictionApi } from './index'

/**
 * Real (on-chain) implementation — NOT YET WIRED.
 *
 * This file closes DESIGN.md §15: it records exactly which program handler
 * backs each api call, so wiring is mechanical rather than archaeological.
 * Screens import `api` from ./index and never this module directly, so
 * swapping the export in index.ts is the only change needed to go live.
 *
 * Program: conviction @ Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH (devnet)
 * IDL: lib/idl/conviction.json — 26 instructions, 10 accounts, 13 errors.
 *
 * ── Why this is still a stub ──────────────────────────────────────────────
 *
 * 1. NO EVENTS. The program contains zero `emit!` calls, so there is no event
 *    stream to subscribe to. Realtime must come from `connection.onAccountChange`
 *    on the delegated PDAs via lib/magicblock.ts (Match, Team, VillainPick,
 *    ChaosEvent; Basket and StopLoss only after reveal_round).
 *
 * 2. PHASE A.2 STUBS. `tick_price` validates the Live phase but never persists
 *    a price, so there is no on-chain price history to chart. `callback_villain`
 *    leaves `villain_mint` as the default Pubkey. `reveal_round` mints a fixed
 *    1 FTR to a single winner rather than walking rosters.
 *
 * 3. SHAPE GAP. The on-chain accounts do not carry the fields these types
 *    need. `Match` has `teams: [Pubkey; 2]`, `pot`, `phase`, `deadline_slot`,
 *    `chaos_count` — but no pnl, no event log, no spectator count. `Team` has
 *    `score: u64` and `alive: u8`, not a percentage P&L. Whoever wires this
 *    must decide per field: derive client-side from Birdeye prices + the
 *    basket mints, or extend the program.
 *
 * Anything marked DERIVED below cannot be read from chain and must be computed.
 */

const notWired = (what: string): never => {
  throw new Error(
    `real.ts: ${what} is not wired yet — Phase B ships on lib/api/mock.ts. See the header of this file.`,
  )
}

export const realApi: ConvictionApi = {
  // ─── Wallet ────────────────────────────────────────────────────────────────
  // connectWallet: no instruction — read from useWallet(), then getFTRBalance.
  // teamName/winRate are DERIVED (no on-chain player profile account exists).
  connectWallet: () => notWired('connectWallet'),
  disconnectWallet: () => notWired('disconnectWallet'),

  // ─── Matchmaking ───────────────────────────────────────────────────────────
  // getOpenMatches / getLiveMatches: program.account.match.all(), then filter
  //   on `phase` (Created|LockedIn => forming, Live => live, Revealed|Finalized
  //   => ended). Match PDA is seeded by match_id; RoundCounter gives the range.
  // getMatch: program.account.match.fetch(matchPda(match_id)).
  // createMatch:  -> create_match(match_id: u32, pot: u64)
  // joinMatch:    -> register_team(match_id: u32, side: u8, members: Vec<TeamMember>)
  // leaveMatch:   NO INSTRUCTION EXISTS. Either add one or make the UI
  //               forming-only-and-final. This is a real gap.
  getOpenMatches: () => notWired('getOpenMatches'),
  getLiveMatches: () => notWired('getLiveMatches'),
  getMatch: () => notWired('getMatch'),
  createMatch: () => notWired('createMatch'),
  joinMatch: () => notWired('joinMatch'),
  leaveMatch: () => notWired('leaveMatch'),

  // ─── Pre-round ─────────────────────────────────────────────────────────────
  // setBasket / setStopLosses: NO separate instructions — both are folded into
  //   lock_in_pre_round, so these should stay client-side (Zustand) until
  //   lock-in. Keep them as local no-ops rather than transactions.
  // lockInPicks: -> lock_in_pre_round(match_id, side, mints: [Pubkey; 3],
  //   weights: [u16; 3], range: StopLossRange { min_bps, max_bps },
  //   per_members: [Pubkey; 8], per_flags: [u8; 8], per_member_count: u8)
  //   then delegate_basket + delegate_stop_loss + init_basket_permission
  //   + init_stop_loss_permission to seal picks in the ER behind PER.
  //   NOTE: on-chain stop-loss is a bps RANGE, while the UI models one
  //   thresholdPct per token. Reconcile before wiring.
  setBasket: () => notWired('setBasket'),
  setStopLosses: () => notWired('setStopLosses'),
  lockInPicks: () => notWired('lockInPicks'),

  // ─── Live round ────────────────────────────────────────────────────────────
  // getRound: fetch Match + both Team accounts from the ER connection.
  //   `events` is DERIVED — no event log on chain. Synthesize from
  //   onAccountChange diffs (phase transitions, alive flags, chaos_count).
  // fold: NO EXPLICIT FOLD INSTRUCTION. Folding happens via the stop-loss
  //   being hit (StopLoss.hit) or finalize_round. A manual fold needs either a
  //   new instruction or a stop-loss update. Another real gap.
  // getLeaderboard: Team.score is a u64, not a percentage. P&L is DERIVED from
  //   Basket.mints + Basket.weights against Birdeye prices at round start.
  // subscribeToRound: getErConnection(matchPda) then onAccountChange on
  //   Match + Team + VillainPick + ChaosEvent. Re-resolve the FQDN via the
  //   router if delegation rotates.
  getRound: () => notWired('getRound'),
  fold: () => notWired('fold'),
  getLeaderboard: () => notWired('getLeaderboard'),
  subscribeToRound: () => notWired('subscribeToRound'),

  // ─── Spectator ─────────────────────────────────────────────────────────────
  // getSpectatorBets: program.account.spectatorBid.all() filtered by match_id.
  //   `prediction` is a [u8; 32] HASH on chain, not readable text — the
  //   plaintext prediction must be kept client-side (or in Supabase, Phase C)
  //   and revealed by preimage. `status` is DERIVED.
  // placeBet: -> place_spectator_bid(match_id, prediction_hash: [u8; 32],
  //   amount: u64, per_members, per_flags, per_member_count)
  //   then delegate_spectator_bid + init_spectator_bid_permission to seal it.
  getSpectatorBets: () => notWired('getSpectatorBets'),
  placeBet: () => notWired('placeBet'),

  // ─── Governance ────────────────────────────────────────────────────────────
  // getFTRBalance: getAssociatedTokenAddress(GameConfig.ftr_mint, wallet)
  //   then getTokenAccountBalance. Real, and wireable today.
  // getProposals: program.account.proposal.all(). NOTE the on-chain shape is
  //   narrower than the UI type: param_name is [u8; 32], new_value is u32, and
  //   status is only Open|Tallied — so 'passed' vs 'failed' is DERIVED by
  //   comparing ftr_yes/ftr_no once Tallied, and 'executed' has no on-chain
  //   representation at all. `currentValue` must be read from GameConfig.
  // createProposal: -> propose_param_change(proposal_id: u32,
  //   param_name: [u8; 32], new_value: u32)
  // vote: -> vote_on_proposal(support_yes: bool). Weight comes from the
  //   voter's FTR token account balance. `isPrivate` has no on-chain
  //   equivalent on Proposal — sealing a vote needs the PER path.
  // Also available, unmapped: tally_proposal (crank to close voting).
  getFTRBalance: () => notWired('getFTRBalance'),
  getProposals: () => notWired('getProposals'),
  createProposal: () => notWired('createProposal'),
  vote: () => notWired('vote'),

  // ─── Tokens ────────────────────────────────────────────────────────────────
  // getTokenUniverse: stays local (tokens.json) + live prices from Birdeye.
  //   The 25-token universe is not stored on chain.
  // getVillainToken: program.account.villainPick.fetch(villainPda(match_id)).
  //   Blocked by the callback_villain placeholder — villain_mint is currently
  //   always the default Pubkey, so this returns nothing meaningful yet.
  getTokenUniverse: () => notWired('getTokenUniverse'),
  getVillainToken: () => notWired('getVillainToken'),
}

/**
 * Handlers with no api counterpart, for completeness:
 *   init_config, init_ftr_mint         — one-time admin setup (scripts, not UI)
 *   delegate_match, delegate_team      — called as part of match start
 *   request_villain_vrf, callback_villain
 *   request_chaos_vrf, callback_chaos  — VRF cranks
 *   tick_price                         — price crank (currently persists nothing)
 *   reveal_round, finalize_round       — round settlement cranks
 *   commit_match_state                 — ER -> L1 state commit
 *   process_undelegation               — injected by #[ephemeral]
 */
