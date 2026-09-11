'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Crown, EyeOff } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, Num, Pnl, Price } from '@/components/ui/num'
import { Progress } from '@/components/ui/progress'
import { StatusPill, teamStatusVariant } from '@/components/ui/status-pill'
import type { Match, Token } from '@/lib/api'
import { tokenByMint } from '@/lib/api/mock-data'
import { entranceEase, motionSafe, nrftRise } from '@/lib/motion'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Results table — the payoff of the whole sealed-picks mechanic.
 *
 * Baskets and thresholds were private all round; this is where they surface.
 *
 * Phase 8 polish:
 *  - Winner row gets the `tone="winner"` wash (border-conviction/30,
 *    bg-conviction/[0.06]) and a Crown icon next to its rank number.
 *  - FTR earned on the winner row rises via `nrftRise` so the governance
 *    token arrival matches the weight of the crown.
 *  - Each row carries an Avatar (monogram fallback of the village name)
 *    and a pot-share Progress bar so the relative size of each position is
 *    legible without comparing P&L percentages by eye.
 */
export function ResultsTable({ match }: { match: Match }) {
  const reduced = useReducedMotion()
  const ranked = [...match.teams].sort((a, b) => {
    const aFolded = a.status === 'folded' ? 1 : 0
    const bFolded = b.status === 'folded' ? 1 : 0
    if (aFolded !== bFolded) return aFolded - bFolded
    return b.pnl - a.pnl
  })

  // Pot-share denominator: sum of non-negative P&L values. If every team lost
  // (sum is 0), the meter still has to render — clamp to 1 so the division is
  // safe and every row reads 0%.
  const totalPositivePnl = ranked.reduce(
    (acc, t) => acc + Math.max(0, t.pnl),
    0,
  )
  const shareDenom = Math.max(1, totalPositivePnl)

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
          const isWinner = i === 0
          const initial = team.name.replace(/\W/g, '').charAt(0).toUpperCase()
          const sharePct =
            team.pnl <= 0
              ? 0
              : Math.round((team.pnl / shareDenom) * 100)
          const ftrEarned = isWinner ? team.walletAddresses.length : 0

          return (
            <div
              key={team.id}
              className={cn(
                'rounded-md border p-3',
                isWinner
                  ? 'border-conviction/30 bg-conviction/[0.06]'
                  : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="font-mono uppercase text-paper">
                      {initial || '·'}
                    </AvatarFallback>
                  </Avatar>
                  <Num size="sm" className="text-whisper">
                    {i + 1}
                  </Num>
                  {isWinner && (
                    <Crown
                      className="h-4 w-4 text-conviction"
                      aria-label="Winner"
                    />
                  )}
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

              {isWinner && (
                <div className="mt-3 border-t border-border pt-3">
                  <PanelLabel>FTR earned</PanelLabel>
                  <motion.span
                    className="mt-0.5 block"
                    variants={motionSafe(nrftRise, reduced)}
                    initial="hidden"
                    animate="visible"
                    transition={{
                      delay: i * 0.2 + 0.4,
                      duration: 0.4,
                      ease: entranceEase,
                    }}
                  >
                    <Ftr value={ftrEarned} size="lg" />
                  </motion.span>
                </div>
              )}

              <div className="mt-3">
                <PanelLabel>Pot share</PanelLabel>
                <Progress
                  value={sharePct}
                  tone="conviction"
                  className="mt-1.5 h-1.5"
                />
              </div>

              {team.basket && (
                <div className="mt-3 border-t border-border pt-3">
                  <PanelLabel>Basket &amp; band</PanelLabel>
                  <div className="mt-2 space-y-1">
                    {team.basket.tokens.map((token: Token) => (
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
                            band {(team.basket!.band.minBps / 100).toFixed(1)}
                            %… {(team.basket!.band.maxBps / 100).toFixed(1)}%
                          </Num>
                        </div>
                      </div>
                    ))}
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
