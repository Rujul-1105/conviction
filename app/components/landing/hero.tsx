'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { fadeInUp, motionSafe, staggerChildren } from '@/lib/motion'

/**
 * Landing hero (DESIGN.md §10 priority 1).
 *
 * Minimal by design — §1 says "data-dense where it matters (live round),
 * minimal where it doesn't (landing)". One headline, one line of positioning,
 * two actions. The only green on the page is the primary CTA and the logo dot.
 */
export function Hero() {
  const reduced = useReducedMotion()

  return (
    <section className="mx-auto max-w-content px-4 py-24 sm:py-32">
      <motion.div
        variants={motionSafe(staggerChildren, reduced)}
        initial="hidden"
        animate="visible"
        className="max-w-3xl"
      >
        <motion.p
          variants={motionSafe(fadeInUp, reduced)}
          className="font-mono text-label uppercase text-conviction"
        >
          MagicBlock Ephemeral Rollups · Devnet
        </motion.p>

        <motion.h1
          variants={motionSafe(fadeInUp, reduced)}
          className="mt-6 font-display text-display-lg font-bold text-paper sm:text-display-xl"
        >
          Conviction or the fold.
        </motion.h1>

        <motion.p
          variants={motionSafe(fadeInUp, reduced)}
          className="mt-6 max-w-xl text-body-lg text-text-muted"
        >
          Two villages pick baskets and set secret stop-losses. Prices move,
          chaos fires, and the pot goes to whoever holds their nerve longest.
          Folding is safe. Folding also loses.
        </motion.p>

        <motion.div
          variants={motionSafe(fadeInUp, reduced)}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link href="/lobby">
            <Button variant="primary" size="lg">
              Play with conviction
            </Button>
          </Link>
          <Link href="/spectate/live-2">
            <Button variant="spectator" size="lg">
              Spectate a round
            </Button>
          </Link>
          <Link href="/welcome">
            <Button variant="ghost" size="lg">
              How it works
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
