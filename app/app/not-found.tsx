import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'
import { TopNav } from '@/components/layout/top-nav'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * 404 — the off-chain page (DESIGN.md §10, Phase 8 polish).
 *
 * Every other surface in the app is a route the program knows about; this is
 * the one route that doesn't exist. Treat it as a brand-mark moment: the
 * shipped wordmark at 320px, the motto micro-line, one primary CTA back to
 * the lobby, and three speculative <Skeleton> rows underneath so the page
 * reads as "you almost landed somewhere" rather than "we have no idea".
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PageBackdrop>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {/* The wordmark at 320px — the largest scale it ships at (DESIGN.md §1). */}
        <Image
          src="/logo/banner_with_logo.png"
          alt="Conviction"
          width={320}
          height={80}
          className="mb-8 rounded-lg border border-border bg-surface p-6"
        />

        {/* Headline — agency-grade display type, snap-settled. */}
        <h1 className="font-display text-display-lg font-bold leading-[0.95] tracking-[-0.02em] text-paper">
          Off-chain.
        </h1>

        {/* Motto micro-line — mono, tracked, hairline. */}
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
          HOLD . RESIST . SURVIVE.
        </p>

        {/* Body — bounded max-w so the sentence doesn't sprawl. */}
        <p className="mx-auto mt-4 max-w-md text-body-md text-text-muted">
          The page you&apos;re after isn&apos;t on the ledger. Yet.
        </p>

        <Link href="/lobby" className="mt-6">
          <Button variant="primary" size="lg">
            Return to lobby
          </Button>
        </Link>

        {/* The user clearly meant to land somewhere — show three speculative matches. */}
        <div className="mt-12 w-full max-w-md space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>

      <Footer />
      </PageBackdrop>
    </div>
  )
}