import { FeatureCards } from '@/components/landing/feature-cards'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Footer } from '@/components/layout/footer'
import { TopNav } from '@/components/layout/top-nav'

/**
 * Landing page — the marquee (DESIGN.md §10 priority 1, Phase 8 polish).
 *
 * Server component. Only the sections that fetch or animate opt into
 * `'use client'`, so the page shell stays server-side and the JS bundle
 * stays small. Composition order matches the brief:
 *
 *   1. TopNav — sticky, carries the global command palette mount.
 *   2. Hero — asymmetric 60/40 split, single headline, two CTAs, plus an
 *      integrated synthetic "tape" at the bottom showing recent activity.
 *   3. FeatureCards — asymmetric 1+2 grid (not 3-up).
 *   4. HowItWorks — numbered editorial row, no eyebrow.
 *   5. Footer — gradient CONVICTION wordmark + on-chain provenance.
 *
 * Phase 8 polish: the standalone LiveTicker component was removed in favour
 * of the heartbeat tape that lives inside the hero — one ticker per page.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Hero />
        <FeatureCards />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
