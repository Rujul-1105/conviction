import type { Variants } from 'framer-motion'

/**
 * Framer Motion variants, from DESIGN.md §9.
 *
 * Every consumer must gate these behind `useReducedMotion()` — the CSS
 * kill-switch in globals.css cannot reach Framer's JS-driven animations.
 *
 * A note on the flash variants: DESIGN.md §1 bans decorative glow, and §9
 * nonetheless defines these as animated box-shadows. That is not a
 * contradiction — the shadow is transient feedback that resolves to fully
 * transparent, so nothing glows at rest. Never leave a box-shadow settled.
 */

/**
 * Shared entrance easing (matches PHASE_B_BRIEF's cubic-bezier(0.16, 1, 0.3, 1)).
 * Typed as a 4-tuple rather than Transition['ease'] — framer-motion 11 types
 * that field as a union that a plain number[] doesn't satisfy.
 */
export const entranceEase = [0.16, 1, 0.3, 1] as const

/** Green ring pulse — a position moved into the money, or a CTA succeeded. */
export const convictionFlash: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(0, 255, 133, 0)' },
  flash: {
    boxShadow: [
      '0 0 0 0 rgba(0, 255, 133, 0.6)',
      '0 0 0 16px rgba(0, 255, 133, 0)',
    ],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

/** Red ring pulse — a fold landed or a stop-loss tripped. Slower, heavier. */
export const foldFlash: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(255, 61, 90, 0)' },
  flash: {
    boxShadow: [
      '0 0 0 0 rgba(255, 61, 90, 0.6)',
      '0 0 0 16px rgba(255, 61, 90, 0)',
    ],
    transition: { duration: 1.0, ease: 'easeOut' },
  },
}

/** Chaos yellow blinks three times and stops. It must never sit lit. */
export const chaosPulse: Variants = {
  initial: { opacity: 1 },
  pulse: {
    opacity: [1, 0.4, 1],
    transition: { duration: 0.6, repeat: 3, ease: 'easeInOut' },
  },
}

/**
 * Reveal cascade. Custom prop is the row index, so the caller drives the
 * stagger: <motion.div custom={i} variants={revealSequence} />
 */
export const revealSequence: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: 'easeOut' },
  }),
}

/** Generic panel/page entrance. Used for cards and route-level content. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: entranceEase } },
}

/** Container that staggers its children — lobby lists, feature cards. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/** New event sliding into the feed from the top. */
export const eventEnter: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: entranceEase } },
}

/**
 * Collapse a variant set to a no-op when the user prefers reduced motion.
 * Returns undefined so `<motion.div variants={undefined}>` simply renders
 * its final state with no animation.
 */
export function motionSafe(
  variants: Variants,
  reduced: boolean | null,
): Variants | undefined {
  return reduced ? undefined : variants
}
