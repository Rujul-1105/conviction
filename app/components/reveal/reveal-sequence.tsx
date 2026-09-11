'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Crown, Skull } from 'lucide-react'
import { Card, PanelLabel } from '@/components/ui/card'
import { Pnl } from '@/components/ui/num'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { Match } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { motionSafe, revealSequence } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { NextMatchCta } from './next-match-cta'
import { PotDistribution } from './pot-distribution'
import { ResultsTable } from './results-table'

/**
 * Reveal cascade (DESIGN.md §10 priority 6).
 *
 * Staggered entrance via the revealSequence variants — `custom` carries the
 * row index so each panel lands 0.2s after the previous one. This is the one
 * place DESIGN.md sanctions a theatrical sequence; with reduced motion the
 * cascade collapses to a no-op and the panels render in final position.
 *
 * Wrapped in a Tabs (defaultValue="auto") that runs the cascade on first paint
 * and lets the user jump back to any step via the tab list. The tab list uses
 * an underline indicator in `bg-conviction` — the active step is the one with
 * conviction-green underline, matching the palette rule that conviction is
 * reserved for in-the-money / primary state.
 *
 * Step ordering (5 total — step 4 is the new "next match" CTA card):
 *   0  Winner crown
 *   1  Villain reveal
 *   2  Results table
 *   3  Pot distribution
 *   4  Next match CTA
 */

const STEP_LABELS = [
  'Winner crown',
  'Villain reveal',
  'Results',
  'Pot distribution',
  'Next match',
]

export function RevealSequence({ match }: { match: Match }) {
  const reduced = useReducedMotion()
  const villain = match.villainTokenMint
    ? tokenByMint(match.villainTokenMint)
    : undefined

  // Winner is the best P&L among teams that never folded. Folding trumps loss
  // — a team that held to the bell beats one that fled, even at -100%.
  const ranked = [...match.teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })
  const winner = ranked[0]

  /**
   * Each step panel is defined once and reused in the cascade (with stagger)
   * and in the manual-jump tabs (without stagger). Defining as variables
   * rather than sub-components keeps the markup co-located so the file
   * stays under the 300-LOC cap.
   */
  const stepPanels: React.ReactNode[] = [
    // 0 — winner crown.
    <div key="step-0" className="text-center">
      <PanelLabel>Round {match.roundNumber} · settled</PanelLabel>
      <h1 className="mt-2 font-display text-display-lg font-bold text-paper">
        {winner?.name}
      </h1>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Crown className="h-5 w-5 text-conviction" />
        <Pnl value={winner?.pnl ?? 0} size="xl" />
      </div>
    </div>,

    // 1 — villain reveal. Hidden all round, so it lands second.
    <Card key="step-1" className="border-fold/30 p-4">
      <div className="flex items-center gap-3">
        <Skull className="h-5 w-5 shrink-0 text-fold" />
        <div className="min-w-0">
          <PanelLabel className="text-fold">
            The villain was drawn by VRF
          </PanelLabel>
          {villain ? (
            <p className="mt-0.5 text-body-lg text-paper">
              <span className="font-display font-bold">{villain.symbol}</span>{' '}
              <span className="text-text-muted">— {villain.name}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-body-md text-text-muted">
              No villain was drawn this round.
            </p>
          )}
        </div>
        {villain && (
          <div className="ml-auto text-right">
            <PanelLabel>24h</PanelLabel>
            <Pnl value={villain.priceChange24h} />
          </div>
        )}
      </div>
    </Card>,

    // 2 — results table.
    <ResultsTable key="step-2" match={match} />,

    // 3 — pot distribution.
    <PotDistribution
      key="step-3"
      match={match}
      winnerName={winner?.name}
    />,

    // 4 — next-match CTA (new in this phase).
    <NextMatchCta key="step-4" />,
  ]

  return (
    <Tabs defaultValue="auto" className="w-full">
      <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
        <TabTrigger value="auto" label="Auto" />
        {STEP_LABELS.map((label, i) => (
          <TabTrigger key={i} value={String(i)} label={label} />
        ))}
      </TabsList>

      {/*
        Auto: cascade every step with the standard revealSequence stagger.
        Manual jumps: render the chosen step alone, no stagger.
      */}
      <TabsContent
        value="auto"
        className="mt-4 space-y-4 ring-offset-0 focus-visible:ring-0"
      >
        {stepPanels.map((panel, i) => (
          <CascadeStep key={i} i={i}>
            {panel}
          </CascadeStep>
        ))}
      </TabsContent>

      {stepPanels.map((panel, i) => (
        <TabsContent
          key={i}
          value={String(i)}
          className="mt-4 ring-offset-0 focus-visible:ring-0"
        >
          {panel}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** Tab trigger with the underline indicator (DESIGN.md §6). */
function TabTrigger({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'rounded-none border-b-2 border-transparent bg-transparent',
        'px-3 py-2 font-mono text-body-sm uppercase',
        'text-whisper transition-colors duration-150',
        'hover:text-paper',
        'data-[state=active]:border-conviction data-[state=active]:text-paper',
        'focus-visible:ring-conviction/40',
      )}
    >
      {label}
    </TabsTrigger>
  )
}

/** One panel in the cascade. `i` drives its stagger delay. */
function CascadeStep({
  i,
  children,
}: {
  i: number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      custom={i}
      variants={motionSafe(revealSequence, reduced)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}
