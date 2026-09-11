'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { fadeInUp, motionSafe, staggerChildren } from '@/lib/motion'

/**
 * How it works — three numbered steps (DESIGN.md §10 priority 1, Phase 8 polish).
 *
 * Phase 8 polish: each step carries a semantic colour identity mirroring the
 * feature cards (conviction / chaos / hold). The ordinal is rendered in that
 * colour, the cell gets a subtle tint, and a top accent rule ties them back
 * to the section palette.
 */

const STEPS = [
  {
    ordinal: '01',
    title: 'Sealed picks',
    body: 'Each village picks a basket of 1–3 SPL tokens and a stop-loss band. Neither side sees the other.',
    accent: 'conviction' as const,
    badge: 'PER · Encryption',
  },
  {
    ordinal: '02',
    title: 'Live round',
    body: 'Prices move. Chaos fires. Chaos costs you. Stop-loss or fold — your call.',
    accent: 'hold' as const,
    badge: 'ER · Sub-second',
  },
  {
    ordinal: '03',
    title: 'Reveal',
    body: 'The villain lands via VRF. The pot distributes to whoever held their nerve longest.',
    accent: 'chaos' as const,
    badge: 'VRF · On-chain',
  },
]

const accentStyles = {
  conviction: {
    ordinal: 'text-conviction',
    rule: 'bg-gradient-to-r from-transparent via-conviction to-transparent',
    tint: 'bg-conviction/[0.03]',
    badge: 'text-conviction',
    badgeBorder: 'border-conviction/30',
  },
  hold: {
    ordinal: 'text-hold',
    rule: 'bg-gradient-to-r from-transparent via-hold to-transparent',
    tint: 'bg-hold/[0.03]',
    badge: 'text-hold',
    badgeBorder: 'border-hold/30',
  },
  chaos: {
    ordinal: 'text-chaos',
    rule: 'bg-gradient-to-r from-transparent via-chaos to-transparent',
    tint: 'bg-chaos/[0.03]',
    badge: 'text-chaos',
    badgeBorder: 'border-chaos/30',
  },
}

export function HowItWorks() {
  const reduced = useReducedMotion()

  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-24">
      {/* Section header — small mono eyebrow + larger display title. */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-whisper">
            / How it works
          </div>
          <h2 className="mt-2 font-display text-heading-lg font-bold uppercase tracking-[-0.01em] text-paper md:text-display-lg">
            Three rounds. Three minutes.
          </h2>
        </div>
        <p className="hidden max-w-sm text-body-md text-text-muted md:block">
          Every match cycles through the same three states. The mechanic is the
          same — the only thing that changes is which village blinks first.
        </p>
      </div>

      <motion.div
        variants={motionSafe(staggerChildren, reduced)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 gap-px bg-border md:grid-cols-3"
      >
        {STEPS.map(({ ordinal, title, body, accent, badge }) => {
          const s = accentStyles[accent]
          return (
            <motion.div
              key={ordinal}
              variants={motionSafe(fadeInUp, reduced)}
              className={`relative bg-ink p-8 md:p-10 ${s.tint}`}
            >
              {/* Top accent rule — gradient in the step's colour */}
              <div className={`absolute inset-x-0 top-0 h-[2px] ${s.rule}`} />

              <div className="flex items-start justify-between gap-4">
                <div
                  className={`font-display text-display-lg font-bold ${s.ordinal}`}
                >
                  {ordinal}
                </div>
                <span
                  className={`rounded-full border ${s.badgeBorder} px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${s.badge}`}
                >
                  {badge}
                </span>
              </div>

              <h3 className="mt-6 font-display text-heading-sm font-bold uppercase tracking-[-0.01em] text-paper">
                {title}
              </h3>
              <p className="mt-3 text-body-md leading-relaxed text-text-muted">
                {body}
              </p>

              {/* Connector line — on the last step, draw a small arrow into the
                  next state to keep the cadence visible. */}
              <div className="mt-6 flex items-center gap-2">
                <span
                  className={`h-px flex-1 bg-gradient-to-r from-current to-transparent ${s.ordinal}`}
                />
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.22em] ${s.ordinal}`}
                >
                  →
                </span>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
