'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, SolAmount } from '@/components/ui/num'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Match } from '@/lib/api'
import { entranceEase, motionSafe, nrftRise } from '@/lib/motion'

/**
 * Pot distribution (DESIGN.md §10 priority 6).
 *
 * NOTE: reveal_round currently mints a fixed 1 FTR to a single winner (Phase
 * A.2 debt), so the per-member split shown here is the intended design, not
 * what the program does yet. FTR rises via the `nrftRise` variant so the
 * governance-token arrival lands with the same cinematic weight as the
 * winner crown — this is the moment the player earns their voice.
 *
 * Roster wraps in `<ScrollArea>` once it crosses 6 members; below that the
 * list stays inline so it doesn't look like there's more to scroll.
 */
export function PotDistribution({
  match,
  winnerName,
}: {
  match: Match
  winnerName?: string
}) {
  const reduced = useReducedMotion()
  const winner = match.teams.find((t) => t.name === winnerName)
  const members = winner?.walletAddresses.length ?? 1
  const perMember = match.pot / members
  const roster = winner?.walletAddresses ?? []
  const wrapScroll = roster.length > 6

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
          <SolAmount
            value={perMember}
            size="xl"
            className="mt-0.5 block"
            decimals={2}
          />
        </div>
        <div>
          <PanelLabel>FTR minted</PanelLabel>
          <motion.span
            className="mt-0.5 block"
            variants={motionSafe(nrftRise, reduced)}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4, duration: 0.4, ease: entranceEase }}
          >
            <Ftr value={members} size="xl" />
          </motion.span>
        </div>
      </div>

      <p className="mt-3 text-body-sm text-text-muted">
        FTR is the governance token. Holding it lets your village propose and
        vote on the rules of the next round.
      </p>

      {roster.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <PanelLabel>Winning roster</PanelLabel>
          {wrapScroll ? (
            <ScrollArea className="mt-2 h-32">
              <ul className="space-y-1">
                {roster.map((addr) => (
                  <li
                    key={addr}
                    className="font-mono text-body-sm text-paper"
                  >
                    {addr.slice(0, 6)}…{addr.slice(-4)}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <ul className="mt-2 space-y-1">
              {roster.map((addr) => (
                <li key={addr} className="font-mono text-body-sm text-paper">
                  {addr.slice(0, 6)}…{addr.slice(-4)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
