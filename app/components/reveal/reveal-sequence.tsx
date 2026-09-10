'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Crown, EyeOff, Skull } from 'lucide-react'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, Num, Pnl, Price, SolAmount } from '@/components/ui/num'
import { StatusPill, teamStatusVariant } from '@/components/ui/status-pill'
import type { Match, Token } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { motionSafe, revealSequence } from '@/lib/motion'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Reveal cascade (DESIGN.md §10 priority 6).
 *
 * Staggered entrance via the revealSequence variants — `custom` carries the row
 * index so each panel lands 0.2s after the previous one. This is the one place
 * DESIGN.md sanctions a theatrical sequence; with reduced motion it renders
 * instantly in final position.
 */
export function RevealSequence({ match }: { match: Match }) {
  const reduced = useReducedMotion()
  const villain = match.villainTokenMint
    ? tokenByMint(match.villainTokenMint)
    : undefined

  // Winner is the best P&L among teams that never folded.
  const ranked = [...match.teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })
  const winner = ranked[0]

  /** Each panel is one step in the cascade; `i` drives its delay. */
  const Step = ({ i, children }: { i: number; children: React.ReactNode }) => (
    <motion.div
      custom={i}
      variants={motionSafe(revealSequence, reduced)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )

  return (
    <div className="space-y-4">
      <Step i={0}>
        <div className="text-center">
          <PanelLabel>Round {match.roundNumber} · settled</PanelLabel>
          <h1 className="mt-2 font-display text-display-lg font-bold text-paper">
            {winner?.name}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Crown className="h-5 w-5 text-conviction" />
            <Pnl value={winner?.pnl ?? 0} size="xl" />
          </div>
        </div>
      </Step>

      {/* Villain reveal — hidden all round, so it lands second. */}
      <Step i={1}>
        <Card className="border-fold/30 p-4">
          <div className="flex items-center gap-3">
            <Skull className="h-5 w-5 shrink-0 text-fold" />
            <div className="min-w-0">
              <PanelLabel className="text-fold">
                The villain was drawn by VRF
              </PanelLabel>
              {villain ? (
                <p className="mt-0.5 text-body-lg text-paper">
                  <span className="font-display font-bold">
                    {villain.symbol}
                  </span>{' '}
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
        </Card>
      </Step>

      <Step i={2}>
        <ResultsTable match={match} />
      </Step>

      <Step i={3}>
        <PotDistribution match={match} winnerName={winner?.name} />
      </Step>
    </div>
  )
}

/**
 * Results table — the payoff of the whole sealed-picks mechanic.
 * Baskets and thresholds were private all round; this is where they surface.
 */
export function ResultsTable({ match }: { match: Match }) {
  const ranked = [...match.teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-whisper" />
        <PanelLabel>Sealed picks, now public</PanelLabel>
      </div>

      <div className="mt-3 space-y-3">
        {ranked.map((team, i) => {
          const worst = team.worstPerformerMint
            ? tokenByMint(team.worstPerformerMint)
            : undefined

          return (
            <div
              key={team.id}
              className={cn(
                'rounded-md border p-3',
                i === 0 ? 'border-conviction/30 bg-conviction/[0.06]' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Num size="sm" className="text-whisper">
                    {i + 1}
                  </Num>
                  <span className="font-display text-body-md font-bold text-paper">
                    {team.name}
                  </span>
                  <StatusPill variant={teamStatusVariant(team.status)}>
                    {team.status}
                  </StatusPill>
                </div>
                <Pnl value={team.pnl} size="xl" />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <PanelLabel>Folded</PanelLabel>
                  <Num size="sm" className="mt-0.5 block text-paper">
                    {team.foldTime ? timeAgo(team.foldTime) : 'Never'}
                  </Num>
                </div>
                <div>
                  <PanelLabel>Worst position</PanelLabel>
                  <Num size="sm" className="mt-0.5 block text-fold">
                    {worst?.symbol ?? '—'}
                  </Num>
                </div>
                <div>
                  <PanelLabel>Players</PanelLabel>
                  <Num size="sm" className="mt-0.5 block text-paper">
                    {team.walletAddresses.length}
                  </Num>
                </div>
              </div>

              {team.basket && (
                <div className="mt-3 border-t border-border pt-3">
                  <PanelLabel>Basket &amp; thresholds</PanelLabel>
                  <div className="mt-2 space-y-1">
                    {team.basket.tokens.map((token: Token) => {
                      const stop = team.basket?.stopLosses.find(
                        (s) => s.tokenMint === token.mint,
                      )
                      return (
                        <div
                          key={token.mint}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-body-sm text-paper">
                            {token.symbol}
                          </span>
                          <div className="flex items-center gap-3">
                            <Price value={token.currentPrice} size="sm" />
                            <Num size="sm" className="text-fold">
                              stop {stop?.thresholdPct ?? '—'}%
                            </Num>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/**
 * Pot distribution.
 * NOTE: reveal_round currently mints a fixed 1 FTR to a single winner (Phase
 * A.2 debt), so the per-member split shown here is the intended design, not
 * what the program does yet.
 */
function PotDistribution({
  match,
  winnerName,
}: {
  match: Match
  winnerName?: string
}) {
  const winner = match.teams.find((t) => t.name === winnerName)
  const members = winner?.walletAddresses.length ?? 1
  const perMember = match.pot / members

  return (
    <Card className="p-4">
      <PanelLabel>Pot distribution</PanelLabel>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <PanelLabel>Total pot</PanelLabel>
          <SolAmount value={match.pot} size="xl" className="mt-0.5 block" />
        </div>
        <div>
          <PanelLabel>Per member</PanelLabel>
          <SolAmount value={perMember} size="xl" className="mt-0.5 block" decimals={2} />
        </div>
        <div>
          <PanelLabel>FTR minted</PanelLabel>
          <Ftr value={members} size="xl" className="mt-0.5 block" />
        </div>
      </div>

      <p className="mt-3 text-body-sm text-text-muted">
        FTR is the governance token. Holding it lets your village propose and
        vote on the rules of the next round.
      </p>
    </Card>
  )
}
