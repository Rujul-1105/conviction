import { shortAddress } from '@/lib/utils'

/**
 * Footer.
 *
 * PHASE_B_BRIEF asks the landing footer to carry the program ID and ER
 * endpoint — for a hackathon judge, visible on-chain provenance is a feature,
 * so these are shown rather than hidden.
 */
const PROGRAM_ID = 'Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH'
const ER_ENDPOINT = 'devnet-router.magicblock.app'

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-8 text-body-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-conviction" />
          <span className="text-text-muted">
            Conviction — Stonk Battles. Solana devnet.
          </span>
        </div>

        <div className="flex flex-col gap-1 sm:items-end">
          <a
            href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="font-mono tabular-nums text-whisper transition-colors hover:text-paper"
          >
            program {shortAddress(PROGRAM_ID, 6)}
          </a>
          <span className="font-mono text-whisper">{ER_ENDPOINT}</span>
        </div>
      </div>
    </footer>
  )
}
