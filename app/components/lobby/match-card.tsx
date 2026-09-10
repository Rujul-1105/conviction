'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { Card, PanelLabel } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Num, SolAmount } from '@/components/ui/num'
import { StatusPill } from '@/components/ui/status-pill'
import type { Match } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Human-readable mode names — the union values are snake-ish, not display copy. */
const MODE_LABEL: Record<Match['mode'], string> = {
  classic: 'Classic',
  reverse: 'Reverse',
  contrarian: 'Contrarian',
  coop: 'Co-op',
}

/** Tier colour: safe reads calm, moonshot reads dangerous. */
const TIER_CLASS: Record<Match['tier'], string> = {
  safe: 'text-hold',
  wild: 'text-chaos',
  moonshot: 'text-fold',
  mixed: 'text-text-muted',
}

/**
 * Open-match card for the lobby (DESIGN.md §10 priority 3).
 *
 * Shows fill state prominently — "how close is this to starting" is the only
 * question a player has in the lobby. Slots are hardcoded to 2 teams because
 * the on-chain Match holds `teams: [Pubkey; 2]`.
 */
const MAX_TEAMS = 2

export function MatchCard({ match }: { match: Match }) {
  const filled = match.teams.length
  const players = match.teams.reduce((n, t) => n + t.walletAddresses.length, 0)
  const isEmpty = filled === 0
  const isFillingFast = filled >= MAX_TEAMS

  // Countdown copy only makes sense once a start time exists.
  const startsIn = match.startTime
    ? Math.max(0, Math.round((match.startTime - Date.now()) / 1000))
    : null

  return (
    <Card interactive className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-heading-sm font-bold text-paper">
              {MODE_LABEL[match.mode]}
            </span>
            <span
              className={cn(
                'font-mono text-label uppercase',
                TIER_CLASS[match.tier],
              )}
            >
              {match.tier}
            </span>
          </div>
          <PanelLabel className="mt-1">Round {match.roundNumber}</PanelLabel>
        </div>

        {isFillingFast ? (
          <StatusPill variant="conviction">Filling fast</StatusPill>
        ) : isEmpty ? (
          <StatusPill variant="pending">Open</StatusPill>
        ) : (
          <StatusPill variant="holding">{filled}/{MAX_TEAMS} villages</StatusPill>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <PanelLabel>Pot</PanelLabel>
          <SolAmount value={match.pot} className="mt-0.5 block" />
        </div>
        <div>
          <PanelLabel>Duration</PanelLabel>
          <Num className="mt-0.5 block text-paper">
            {Math.round(match.duration / 60)}m
          </Num>
        </div>
        <div>
          <PanelLabel>Players</PanelLabel>
          <span className="mt-0.5 flex items-center gap-1">
            <Users className="h-3 w-3 text-whisper" />
            <Num className="text-paper">{players}</Num>
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-body-sm text-text-muted">
          {isEmpty
            ? 'Be the first village in'
            : startsIn !== null && startsIn < 120
              ? `Starts in ${startsIn}s`
              : 'Waiting for a rival village'}
        </span>
        <Link href={`/match/${match.id}/setup`}>
          <Button variant={isFillingFast ? 'primary' : 'secondary'} size="sm">
            {isEmpty ? 'Create village' : 'Join'}
          </Button>
        </Link>
      </div>
    </Card>
  )
}
