import { FeatureCards } from '@/components/landing/feature-cards'
import { Hero } from '@/components/landing/hero'
import { LiveTicker } from '@/components/landing/live-ticker'
import { Footer } from '@/components/layout/footer'
import { TopNav } from '@/components/layout/top-nav'

/**
 * Landing page (DESIGN.md §10 priority 1).
 *
 * A server component that composes client children — only the pieces that
 * fetch or animate opt into 'use client', so the page shell stays server-side.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Hero />
        <LiveTicker />
        <FeatureCards />
      </main>
      <Footer />
    </div>
  )
}
