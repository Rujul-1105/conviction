/**
 * Devnet bootstrap script — run once after `anchor deploy --provider.cluster devnet`.
 *
 * Idempotent: skips `init_config` and `init_ftr_mint` if the PDAs already
 * exist on chain. Re-running is safe.
 *
 * Usage:
 *   anchor deploy --provider.cluster devnet
 *   anchor run init-devnet           # this script
 *   # or: ts-node migrations/deploy.ts
 *
 * Knobs (env vars, all optional):
 *   BASE_POT_LAMPORTS    default 1_000_000_000  (1 SOL)
 *   ROUND_DURATION_SECS  default 900            (15 min)
 *   CHAOS_EVENT_MAX      default 3
 *   FTR_DECIMALS         default 6
 *
 * Note: the FTR mint keypair is generated on each run. The script writes
 * the mint pubkey to `.ftr-mint.pubkey` so subsequent runs can reuse it
 * (and so deploys stay deterministic).
 */

import * as anchor from '@coral-xyz/anchor'
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Conviction as anchor.Program
  const connection = provider.connection
  const wallet = (provider.wallet as anchor.Wallet).payer

  // ── PDA derivations ─────────────────────────────────────────────────────────
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId,
  )
  const [ftrAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('ftr_authority')],
    program.programId,
  )
  const [roundCounterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('round')],
    program.programId,
  )

  console.log(`program_id   = ${program.programId.toBase58()}`)
  console.log(`config_pda   = ${configPda.toBase58()}`)
  console.log(`ftr_auth_pda = ${ftrAuthorityPda.toBase58()}`)
  console.log(`round_pda    = ${roundCounterPda.toBase58()}`)
  console.log(`authority    = ${wallet.publicKey.toBase58()}`)

  // ── 1. init_config ─────────────────────────────────────────────────────────
  const configInfo = await connection.getAccountInfo(configPda)
  if (configInfo) {
    console.log('[skip] GameConfig already initialised')
  } else {
    const basePot = new BN(
      Number(process.env.BASE_POT_LAMPORTS ?? 1_000_000_000),
    )
    const duration = Number(process.env.ROUND_DURATION_SECS ?? 900)
    const chaosMax = Number(process.env.CHAOS_EVENT_MAX ?? 3)

    await program.methods
      .initConfig(basePot, duration, chaosMax)
      .accounts({
        admin: wallet.publicKey,
        ftrAuthority: ftrAuthorityPda,
        roundCounter: roundCounterPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
    console.log('[ok] GameConfig initialised')
  }

  // ── 2. init_ftr_mint ───────────────────────────────────────────────────────
  // Load (or generate) the FTR mint keypair. Persist to disk so re-runs
  // don't try to init the same mint twice.
  const mintKeyFile = path.join(__dirname, '..', '.ftr-mint.json')
  let ftrMintKp: Keypair
  if (fs.existsSync(mintKeyFile)) {
    const raw = JSON.parse(fs.readFileSync(mintKeyFile, 'utf-8'))
    ftrMintKp = Keypair.fromSecretKey(Uint8Array.from(raw))
  } else {
    ftrMintKp = Keypair.generate()
    fs.writeFileSync(
      mintKeyFile,
      JSON.stringify(Array.from(ftrMintKp.secretKey)),
    )
    console.log('[gen] FTR mint keypair written to', mintKeyFile)
  }

  const mintInfo = await connection.getAccountInfo(ftrMintKp.publicKey)
  if (mintInfo) {
    console.log(
      '[skip] FTR mint already initialised at',
      ftrMintKp.publicKey.toBase58(),
    )
  } else {
    const decimals = Number(process.env.FTR_DECIMALS ?? 6)
    await program.methods
      .initFtrMint(decimals)
      .accounts({
        ftrMint: ftrMintKp.publicKey,
        ftrAuthority: ftrAuthorityPda,
        admin: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ftrMintKp])
      .rpc()
    console.log('[ok] FTR mint initialised at', ftrMintKp.publicKey.toBase58())
  }

  console.log('\nDevnet ready.')
  console.log(`  solana account ${ftrMintKp.publicKey.toBase58()} --url devnet`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})