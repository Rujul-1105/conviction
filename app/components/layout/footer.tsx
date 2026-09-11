import Image from 'next/image'
import Link from 'next/link'
import { shortAddress } from '@/lib/utils'

/**
 * Footer (Phase 8 + Phase 8 hero-mark polish).
 *
 * Three vertical beats:
 *  1. Brand mark — the shipped wordmark lockup at hero scale, the only place
 *     on the site where the full `banner_with_logo.png` reads. Cap at 1080px
 *     so it never dominates on ultrawide.
 *  2. Identity strip — tagline + on-chain provenance. Mono micro-type for
 *     the program ID and ER endpoint so they line up with any other
 *     addresses shown elsewhere.
 *  3. Subtle separator with build/version metadata.
 */
const PROGRAM_ID = 'Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH'
const ER_ENDPOINT = 'devnet-router.magicblock.app'

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-ink">
      {/* ── Beat 1: Brand mark — the wordmark lockup at hero scale. ─────── */}
      <div className="relative border-b border-border">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-4 px-4 py-16 md:py-20">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
            Brand mark · Static · v1 · 2026
          </span>
          <Link
            href="/"
            className="block w-full max-w-[1080px] transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo/banner_with_logo.png"
              alt="Conviction — HOLD . RESIST . SURVIVE."
              width={1920}
              height={480}
              className="h-auto w-full rounded-lg border border-border bg-surface/60 p-8 backdrop-blur-sm md:p-12"
              priority={false}
            />
          </Link>
          <p className="mt-2 max-w-xl text-center font-mono text-[11px] uppercase tracking-[0.22em] text-whisper">
            HOLD . RESIST . SURVIVE.
          </p>
        </div>
      </div>

      {/* ── Beat 2 + 3: Identity + on-chain provenance + build metadata. ── */}
      <div className="relative">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-conviction" />
              <span className="text-text-muted">
                Conviction — Stonk Battles. Solana devnet.
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-whisper/70">
              Build 8.0 · Phase 8 visual redesign · ADR 0005
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] tabular-nums text-text-muted transition-colors hover:text-paper"
            >
              program {shortAddress(PROGRAM_ID, 6)}
            </a>
            <span className="font-mono text-[11px] text-whisper">
              ER · {ER_ENDPOINT}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
