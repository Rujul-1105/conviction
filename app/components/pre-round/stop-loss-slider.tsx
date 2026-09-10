'use client'

import { Lock, Users } from 'lucide-react'
import { PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import { Slider } from '@/components/ui/slider'
import { StatusPill } from '@/components/ui/status-pill'
import type { Token } from '@/lib/api'
import { useRoundUIStore } from '@/lib/store/round-store'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { shortAddress } from '@/lib/utils'

/**
 * Stop-loss step (DESIGN.md §10 priority 4).
 *
 * One slider per selected token, in fold red because that's what it arms.
 * Range is -1% to -40%: tighter than -1 isn't meaningfully a stop, and past
 * -40 the position is effectively unprotected anyway.
 *
 * NOTE for the real wiring: the program stores a single bps RANGE per
 * StopLoss account (`range: { min_bps, max_bps }`), not one threshold per
 * token. That mismatch is flagged in lib/api/real.ts and must be reconciled.
 */
const MIN_STOP = -40
const MAX_STOP = -1

export function StopLossSlider({ tokens }: { tokens: Token[] }) {
  const { selectedBasketTokens, stopLosses, setStopLoss } = useRoundUIStore()

  const selected = selectedBasketTokens
    .map((mint) => tokens.find((t) => t.mint === mint))
    .filter((t): t is Token => Boolean(t))

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-volatility/30 bg-volatility/10 p-3">
        <Lock className="h-4 w-4 shrink-0 text-volatility" />
        <p className="text-body-sm text-text-muted">
          Your thresholds are sealed in a Permissioned Ephemeral Rollup at
          lock-in. The rival village cannot read them until the round reveals.
        </p>
      </div>

      {selected.map((token) => {
        const value = stopLosses[token.mint] ?? -10
        return (
          <div
            key={token.mint}
            className="rounded-md border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-display text-body-md font-bold text-paper">
                  {token.symbol}
                </span>
                <p className="text-body-sm text-text-muted">{token.name}</p>
              </div>
              <div className="text-right">
                <PanelLabel>Auto-fold at</PanelLabel>
                <Num size="lg" className="text-fold">
                  {value}%
                </Num>
              </div>
            </div>

            <Slider
              className="mt-4"
              min={MIN_STOP}
              max={MAX_STOP}
              step={1}
              value={[value]}
              onValueChange={([v]) => setStopLoss(token.mint, v)}
              aria-label={`Stop-loss threshold for ${token.symbol}`}
            />

            <div className="mt-2 flex justify-between">
              <Num size="sm" className="text-whisper">
                {MIN_STOP}%
              </Num>
              <span className="text-body-sm text-text-muted">
                {value <= -25
                  ? 'Deep conviction. Survives chaos, bleeds hard.'
                  : value <= -12
                    ? 'Balanced. Most villages sit here.'
                    : 'Tight. One chaos event ends your round.'}
              </span>
              <Num size="sm" className="text-whisper">
                {MAX_STOP}%
              </Num>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Team step — mock teammates plus a lock-in confirmation.
 *
 * PHASE_B_BRIEF lists real-time chat as an explicit anti-goal, so this shows
 * the roster and readiness only, not a chat pane.
 */
export function TeamPicker() {
  const { address, teamName } = useGameWallet()

  // Mock teammates. There is no matchmaking account on chain — rosters are
  // passed directly to register_team, so the real version would read Team.members.
  const teammates = [
    { address: address ?? 'you', label: 'You', ready: true },
    { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', label: 'Teammate', ready: true },
    { address: '3nPqB8VmKcLdFvQhTxYwRsAeJgMnZuXwCvBnMkLpQrSt', label: 'Teammate', ready: false },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-whisper" />
            <span className="font-display text-body-md font-bold text-paper">
              {teamName ?? 'Your village'}
            </span>
          </div>
          <StatusPill variant="pending">
            {teammates.filter((t) => t.ready).length}/{teammates.length} ready
          </StatusPill>
        </div>

        <div className="mt-4 space-y-2">
          {teammates.map((mate, i) => (
            <div
              key={`${mate.address}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-body-sm text-paper">{mate.label}</span>
                <Num size="sm" className="text-text-muted">
                  {shortAddress(mate.address)}
                </Num>
              </div>
              <StatusPill variant={mate.ready ? 'conviction' : 'pending'}>
                {mate.ready ? 'Ready' : 'Waiting'}
              </StatusPill>
            </div>
          ))}
        </div>
      </div>

      <p className="text-body-sm text-text-muted">
        Locking in writes your basket and thresholds on chain and delegates them
        to the rollup. After that, the only choice left is when to fold.
      </p>
    </div>
  )
}
