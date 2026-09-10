'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Dice5, EyeOff, Timer } from 'lucide-react'
import { Card, PanelLabel } from '@/components/ui/card'
import { fadeInUp, motionSafe, staggerChildren } from '@/lib/motion'

/**
 * Three feature cards (DESIGN.md §10 priority 1).
 *
 * Each one maps to a real mechanic backed by the program: PER-sealed
 * stop-losses, VRF villain + chaos events, and ER sub-second settlement.
 * Static copy — no data fetching.
 */
const FEATURES = [
  {
    Icon: EyeOff,
    label: 'Sealed picks',
    title: 'Nobody sees your stop-loss',
    body: 'Baskets and thresholds are written into a Permissioned Ephemeral Rollup at lock-in. They stay encrypted to everyone but your village until the round reveals.',
  },
  {
    Icon: Dice5,
    label: 'Verifiable chaos',
    title: 'The villain is drawn by VRF',
    body: 'One token per round is secretly cursed, and chaos events fire from on-chain randomness. Nobody — including us — knows which until it lands.',
  },
  {
    Icon: Timer,
    label: 'Real-time state',
    title: 'Folds land in under a second',
    body: 'Match state is delegated to an Ephemeral Rollup, so a fold registers at rollup speed and settles back to Solana when the round closes.',
  },
]

export function FeatureCards() {
  const reduced = useReducedMotion()

  return (
    <section className="mx-auto max-w-content px-4 py-20">
      <motion.div
        variants={motionSafe(staggerChildren, reduced)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid gap-4 md:grid-cols-3"
      >
        {FEATURES.map(({ Icon, label, title, body }) => (
          <motion.div key={title} variants={motionSafe(fadeInUp, reduced)}>
            <Card className="h-full p-6">
              <Icon className="h-5 w-5 text-whisper" />
              <PanelLabel className="mt-4">{label}</PanelLabel>
              <h3 className="mt-2 font-display text-heading-sm font-bold text-paper">
                {title}
              </h3>
              <p className="mt-3 text-body-md text-text-muted">{body}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
