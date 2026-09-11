'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { fadeInUp, motionSafe } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Onboarding carousel (DESIGN.md §10 priority 9).
 *
 * Three slides: pick a basket, set a stop-loss, survive. Deliberately explains
 * the *tension* rather than the UI — the mechanic only makes sense once you
 * understand that folding is both the safe move and the losing move.
 *
 * Lives at /welcome (route group (onboarding) doesn't affect the URL).
 *
 * Phase 8 polish:
 *  - Final slide headline becomes "HOLD . RESIST . SURVIVE." — the motto
 *    is the brand's signature, so it lands on the last frame before the
 *    user commits.
 *  - Final slide CTAs: <Button primary> → /connect,
 *    <Button secondary> → /spectate/spectate-demo. The spectator path is
 *    wallet-free, so it reads as "watch first, play second".
 */
const SLIDES = [
  {
    label: 'One of three',
    title: 'Pick three tokens',
    body: 'Your village drafts a basket from a curated universe of 25 SPLs, tiered from majors down to moonshots. Everyone drafts blind — you never see the rival village’s picks.',
  },
  {
    label: 'Two of three',
    title: 'Set a secret stop-loss',
    body: 'Choose the drawdown that auto-folds you. Tight thresholds survive nothing but lose little; deep ones ride out chaos and bleed. Your number is sealed in a rollup until the round ends.',
  },
  {
    label: 'Three of three',
    title: 'HOLD . RESIST . SURVIVE.',
    body: 'Prices move, a VRF-drawn villain token drags, and chaos events fire without warning. Fold and you are safe but out. The pot goes to whoever held their nerve.',
  },
]

export default function WelcomePage() {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  return (
    <div className="flex min-h-screen flex-col">
      <PageBackdrop>
      <header className="flex items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-conviction" />
          <span className="font-display text-body-lg font-bold text-paper">
            Conviction
          </span>
        </Link>
        <Link href="/lobby">
          <Button variant="ghost" size="sm">
            Skip
          </Button>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <Card className="p-8">
            {/* key on index so the slide re-animates on each change. */}
            <motion.div
              key={index}
              variants={motionSafe(fadeInUp, reduced)}
              initial="hidden"
              animate="visible"
            >
              <PanelLabel>{slide.label}</PanelLabel>
              <h1 className="mt-3 font-display text-heading-lg font-bold text-paper">
                {slide.title}
              </h1>
              <p className="mt-4 text-body-lg text-text-muted">{slide.body}</p>
            </motion.div>
          </Card>

          <div className="mt-6 flex items-center justify-between gap-4">
            {/* Dots double as direct navigation. */}
            <div className="flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-colors',
                    i === index ? 'w-6 bg-conviction' : 'w-1.5 bg-border',
                  )}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {index > 0 && (
                <Button variant="ghost" onClick={() => setIndex(index - 1)}>
                  Back
                </Button>
              )}
              {isLast ? (
                // Final-slide CTAs: primary to /connect (the wallet path),
                // secondary to the spectator demo (wallet-free entry).
                <>
                  <Link href="/spectate/spectate-demo">
                    <Button variant="secondary" size="lg">
                      Spectate first
                    </Button>
                  </Link>
                  <Link href="/connect">
                    <Button variant="primary" size="lg">
                      Let&apos;s play
                    </Button>
                  </Link>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIndex(index + 1)}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      </PageBackdrop>
    </div>
  )
}