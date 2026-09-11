'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { EyeOff, Sparkles, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { fadeInUp, motionSafe, staggerChildren } from '@/lib/motion'

/**
 * Feature cards — asymmetric 1+2 (DESIGN.md §10 priority 1, Phase 8 polish).
 *
 * Phase 8 polish: each card now carries a semantic colour identity from the
 * design tokens, so the section reads as a system rather than a uniform wall
 * of surface cards:
 *  - Sealed picks → conviction (green accent line, gradient keyhole)
 *  - VRF villain → chaos (yellow accent line + sparkle accent)
 *  - ER settlement → hold (blue accent line + zap accent)
 *
 * Each card gets a top accent rule in its semantic colour, a coloured icon,
 * and a subtle gradient backdrop. The sealed picks lock SVG gains a
 * conviction-green glow ring around the keyhole.
 */

const RIGHT_CARDS = [
  {
    Icon: Sparkles,
    title: 'VRF villain',
    body: 'One token per round is secretly cursed by on-chain randomness. Chaos fires from it. Nobody — including us — knows which until it lands.',
    accent: 'chaos' as const,
  },
  {
    Icon: Zap,
    title: 'ER settlement',
    body: 'Match state is delegated to an Ephemeral Rollup. A fold lands at rollup speed and settles back to Solana when the round closes.',
    accent: 'hold' as const,
  },
]

/** Accent styling per semantic colour — kept tiny so we don't drift off-spec. */
const accentStyles = {
  conviction: {
    rule: 'bg-conviction',
    border: 'border-conviction/30',
    iconBg: 'bg-conviction/10',
    iconText: 'text-conviction',
    bodyAccent: 'text-conviction/90',
    glow: 'bg-conviction/[0.05]',
  },
  chaos: {
    rule: 'bg-chaos',
    border: 'border-chaos/30',
    iconBg: 'bg-chaos/10',
    iconText: 'text-chaos',
    bodyAccent: 'text-chaos/90',
    glow: 'bg-chaos/[0.05]',
  },
  hold: {
    rule: 'bg-hold',
    border: 'border-hold/30',
    iconBg: 'bg-hold/10',
    iconText: 'text-hold',
    bodyAccent: 'text-hold/90',
    glow: 'bg-hold/[0.05]',
  },
}

export function FeatureCards() {
  const reduced = useReducedMotion()

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 py-20 md:py-24">
        <motion.div
          variants={motionSafe(staggerChildren, reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {/* ── Left column — tall hero card (md:row-span-2, conviction accent) */}
          <motion.div
            variants={motionSafe(fadeInUp, reduced)}
            className="md:row-span-2"
          >
            <Card className="relative flex h-full flex-col justify-between overflow-hidden border-conviction/30 bg-conviction/[0.04] p-6 md:p-8">
              {/* Top accent rule — the 2px conviction-green line that says
                  "this card is the in-the-money mechanic". */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-conviction to-transparent" />

              {/* Soft conviction glow in the corner. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-conviction/[0.05] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-conviction/30 bg-conviction/[0.1]">
                    <EyeOff className="h-4 w-4 text-conviction" strokeWidth={1.5} />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-conviction/80">
                    01 · Sealed
                  </span>
                </div>
                <h3 className="mt-5 font-display text-heading-lg font-bold text-paper">
                  Sealed picks
                </h3>
                <p className="mt-3 max-w-md text-body-md text-text-muted">
                  Baskets and stop-losses are written into a Permissioned
                  Ephemeral Rollup at lock-in. They stay encrypted to everyone
                  but your village until the round reveals.
                </p>
              </div>

              {/* Sealed-permission SVG with a conviction-glow ring on the
                  keyhole — the only colour in the entire section that lives
                  INSIDE an illustration. */}
              <div className="relative mt-8 flex items-center justify-center">
                <SealedPermissionSvg />
              </div>
            </Card>
          </motion.div>

          {/* ── Right column — two stacked cards with semantic accents ──────── */}
          {RIGHT_CARDS.map(({ Icon, title, body, accent }, i) => {
            const s = accentStyles[accent]
            return (
              <motion.div
                key={title}
                variants={motionSafe(fadeInUp, reduced)}
                custom={i}
                className="group"
              >
                <Card
                  className={
                    'relative h-full overflow-hidden p-6 md:p-8 ' +
                    `${s.border} ${s.glow}`
                  }
                >
                  {/* Top accent rule */}
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent ${s.iconText}`}
                  />
                  {/* Hover accent — subtle lift on the right column. */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${s.glow.replace('[0.05]', '[0.12]')}`}
                  />

                  <div className="relative flex items-center gap-2">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-md border ${s.border} ${s.iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${s.iconText}`} strokeWidth={1.5} />
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${s.bodyAccent}`}
                    >
                      0{i + 2} · {accent === 'chaos' ? 'Random' : 'Rollup'}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-heading-sm font-bold text-paper">
                    {title}
                  </h3>
                  <p className="mt-3 text-body-md text-text-muted">{body}</p>

                  {/* Bottom-right corner badge — semantic colour stamp */}
                  <div className="mt-4 flex items-center justify-end">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.22em] ${s.bodyAccent}`}
                    >
                      {accent === 'chaos' ? '⚡ On-chain randomness' : '⚡ Sub-second'}
                    </span>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

/**
 * Sealed-permission glyph — 1px-bordered square with a dotted inner ring
 * (the encryption boundary), a lock mark, and a glowing conviction-green
 * keyhole. Glow ring sits at ~40% radius around the keyhole to draw the eye.
 */
function SealedPermissionSvg() {
  return (
    <svg
      width="180"
      height="130"
      viewBox="0 0 180 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Outer frame — the PER PDA itself */}
      <rect
        x="8"
        y="8"
        width="164"
        height="114"
        rx="6"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {/* Inner dotted ring — encryption boundary */}
      <rect
        x="28"
        y="24"
        width="124"
        height="82"
        rx="4"
        stroke="var(--whisper)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {/* Corner ticks — like a vault or a sealed envelope */}
      <path d="M14 18 V14 H18" stroke="var(--whisper)" strokeWidth="1" />
      <path d="M162 14 H166 V18" stroke="var(--whisper)" strokeWidth="1" />
      <path d="M14 112 V116 H18" stroke="var(--whisper)" strokeWidth="1" />
      <path d="M162 116 H166 V112" stroke="var(--whisper)" strokeWidth="1" />
      {/* Lock body */}
      <rect
        x="78"
        y="64"
        width="24"
        height="22"
        rx="2"
        stroke="var(--paper)"
        strokeWidth="1.25"
      />
      {/* Lock shackle */}
      <path
        d="M82 64 V56 a8 8 0 0 1 16 0 V64"
        stroke="var(--paper)"
        strokeWidth="1.25"
        fill="none"
      />
      {/* Conviction-green glow ring around the keyhole — the only colour
          in this illustration. Reads as light, not as a glow ring. */}
      <circle cx="90" cy="74" r="9" fill="var(--conviction)" opacity="0.18" />
      <circle cx="90" cy="74" r="2" fill="var(--conviction)" />
    </svg>
  )
}
