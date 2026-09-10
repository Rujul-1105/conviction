/**
 * The palette, in TypeScript.
 *
 * Components must use Tailwind tokens (`text-conviction`), never these values —
 * DESIGN.md §14 bans hex literals in components. This module exists for the
 * places Tailwind can't reach: Framer Motion animating a colour, canvas/SVG
 * chart strokes, and rgba() interpolation.
 *
 * Source of truth is DESIGN.md §1. Keep in sync with tailwind.config.ts.
 */
export const colors = {
  ink: '#0A0A0A',
  paper: '#F5F5F0',
  surface: '#161616',
  surfaceElevated: '#1F1F1F',
  border: '#2A2A2A',
  whisper: '#6B6B6B',
  textMuted: '#A0A0A0',
  conviction: '#00FF85',
  convictionDim: '#00CC6A',
  fold: '#FF3D5A',
  foldDim: '#CC2E47',
  hold: '#4A9EFF',
  holdDim: '#3A7FCC',
  chaos: '#FFD23F',
  volatility: '#9D4EDD',
} as const

export type ColorName = keyof typeof colors

/** RGB triples for the accents, for building rgba() strings in motion code. */
export const rgb = {
  conviction: '0, 255, 133',
  fold: '255, 61, 90',
  hold: '74, 158, 255',
  chaos: '255, 210, 63',
  volatility: '157, 78, 221',
} as const

/**
 * Pick the semantic colour for a P&L figure.
 *
 * Deliberately returns Tailwind class names rather than hex, so callers stay
 * compliant with the no-hex rule. Exactly zero is muted, not green — a flat
 * position is not "in the money".
 */
export function pnlColorClass(pnl: number): string {
  if (pnl > 0) return 'text-conviction'
  if (pnl < 0) return 'text-fold'
  return 'text-text-muted'
}
