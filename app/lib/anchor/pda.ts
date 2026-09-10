/**
 * PDA derivation helpers for the conviction program.
 *
 * Centralizes the `[SEED, ...key]` tuples so every screen / api call asks
 * for the same PDA given the same inputs. The seed names mirror
 * `programs/conviction/src/constants.rs` byte-for-byte.
 *
 * Usage:
 *   const matchPda = findMatchPda(7)              // [0x6d, 0x61, 0x74, 0x63, 0x68, 7, 0, 0, 0]
 *   const teamPda = findTeamPda(7, 0)             // [team, 7, 0, 0, 0, 0]
 *   const basketPda = findBasketPda(7, 0, wallet) // [basket, 7, 0, 0, 0, wallet]
 *
 * All match-id keys are 4-byte little-endian u32, matching Anchor's
 * `&match_id.to_le_bytes()` pattern.
 */

import { PublicKey } from '@solana/web3.js'
import { PROGRAM_ID } from './program'

// PDA seed prefixes — must match `constants.rs` in the program crate.
const SEEDS = {
  config: Buffer.from('config'),
  match: Buffer.from('match'),
  team: Buffer.from('team'),
  basket: Buffer.from('basket'),
  stopLoss: Buffer.from('stop-loss'),
  villain: Buffer.from('villain'),
  chaos: Buffer.from('chaos'),
  proposal: Buffer.from('proposal'),
  round: Buffer.from('round'),
  ftrAuthority: Buffer.from('ftr_authority'),
} as const

function u32le(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n, 0)
  return b
}

/**
 * Derive the GameConfig PDA — singleton.
 */
export function findConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.config],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive the Match PDA for a given `match_id`.
 */
export function findMatchPda(matchId: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.match, u32le(matchId)],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive a Team PDA for `(matchId, side)`.
 * `side` is 0 or 1.
 */
export function findTeamPda(matchId: number, side: number): PublicKey {
  const sideBuf = Buffer.from([side])
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.team, u32le(matchId), sideBuf],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive a Basket PDA for a per-player basket slot.
 * `player` is the wallet that owns the basket.
 */
export function findBasketPda(
  matchId: number,
  side: number,
  player: PublicKey,
): PublicKey {
  const sideBuf = Buffer.from([side])
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.basket, u32le(matchId), sideBuf, player.toBuffer()],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive a StopLoss PDA — companion to a Basket PDA.
 */
export function findStopLossPda(
  matchId: number,
  side: number,
  player: PublicKey,
): PublicKey {
  const sideBuf = Buffer.from([side])
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.stopLoss, u32le(matchId), sideBuf, player.toBuffer()],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive the VillainPick PDA for a match.
 */
export function findVillainPda(matchPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.villain, matchPda.toBuffer()],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive a ChaosEvent PDA for `(matchId, sequence)`.
 */
export function findChaosPda(matchId: number, sequence: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.chaos, u32le(matchId), u32le(sequence)],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive a Proposal PDA by `proposal_id`.
 */
export function findProposalPda(proposalId: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.proposal, u32le(proposalId)],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive the singleton RoundCounter PDA.
 */
export function findRoundCounterPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.round],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}

/**
 * Derive the FTR mint authority PDA — used as the SPL mint authority.
 */
export function findFtrAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.ftrAuthority],
    new PublicKey(PROGRAM_ID),
  )
  return pda
}