'use client'

import { Lock, Users } from 'lucide-react'
import { PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import { Slider } from '@/components/ui/slider'
import { StatusPill } from '@/components/ui/status-pill'
import { STOP_LOSS_BAND_LIMITS, useRoundUIStore } from '@/lib/store/round-store'
import { useGameWallet } from '@/lib/hooks/use-wallet'
import { shortAddress } from '@/lib/utils'

/**
 * Stop-loss step (DESIGN.md §10 priority 4).
 *
 * ONE band for the whole basket, matching the on-chain
 * `StopLossRange { min_bps, max_bps }` shape. Two sliders — the floor
 * (deepest allowed loss) and the edge (closest-to-zero allowed loss) —
 * enforce `minBps < maxBps` in the setter. When the basket's worst
 * performer drops out of this band, the whole team auto-folds.
 *
 * Range is -1% to -40%: tighter than -1 isn't meaningfully a stop, and
 * past -40 the position is effectively unprotected anyway.
 */
const BPS_MIN = STOP_LOSS_BAND_LIMITS.minBps // -4000 = -40%
const BPS_MAX = STOP_LOSS_BAND_LIMITS.maxBps //  -100 = -1%

export function StopLossSlider() {
  const { basketStopLossBand, setStopLossBand } = useRoundUIStore()
  const { minBps: floor, maxBps: edge } = basketStopLossBand

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-volatility/30 bg-volatility/10 p-3">
        <Lock className="h-4 w-4 shrink-0 text-volatility" />
        <p className="text-body-sm text-text-muted">
          One band for the whole basket — sealed in a Permissioned Ephemeral
          Rollup at lock-in. If the worst-performer drops out of this range,
          the whole team auto-folds.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display text-body-md font-bold text-paper">
              Basket band
            </span>
            <p className="text-body-sm text-text-muted">
              Floor (deepest loss) → Edge (closest stop)
            </p>
          </div>
          <div className="text-right">
            <PanelLabel>Range</PanelLabel>
            <Num size="lg" className="text-fold">
              {(floor / 100).toFixed(1)}% … {(edge / 100).toFixed(1)}%
            </Num>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <PanelLabel>Floor</PanelLabel>
              <Num size="md" className="text-fold">
                {(floor / 100).toFixed(1)}%
              </Num>
            </div>
            <Slider
              className="mt-2"
              min={BPS_MIN}
              max={BPS_MAX}
              step={50}
              value={[floor]}
              onValueChange={([v]) =>
                setStopLossBand({ minBps: v, maxBps: edge })
              }
              aria-label="Basket stop-loss floor (deepest allowed loss)"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <PanelLabel>Edge</PanelLabel>
              <Num size="md" className="text-fold">
                {(edge / 100).toFixed(1)}%
              </Num>
            </div>
            <Slider
              className="mt-2"
              min={BPS_MIN}
              max={BPS_MAX}
              step={50}
              value={[edge]}
              onValueChange={([v]) =>
                setStopLossBand({ minBps: floor, maxBps: v })
              }
              aria-label="Basket stop-loss edge (closest-to-zero stop)"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Num size="sm" className="text-whisper">
            {BPS_MIN / 100}%
          </Num>
          <span className="text-body-sm text-text-muted">
            {edge >= -500
              ? 'Tight band. One chaos event ends your round.'
              : edge >= -1500
                ? 'Balanced. Most teams sit here.'
                : 'Wide band. Survives chaos, bleeds hard.'}
          </span>
          <Num size="sm" className="text-whisper">
            {BPS_MAX / 100}%
          </Num>
        </div>
      </div>
    </div>
  )
}

/**
 * Team step — mock teammates plus a lock-in confirmation.
 *
 * PHASE_B_BRIEF lists real-time chat as an explicit anti-goal, so this shows
 * the roster and readiness only, not a chat pane.
 *
 * NOTE for real wiring: rosters are stored in `Team.members` on chain.
 * The Phase 3 real.ts wire-up will read them from the team PDA; for now
 * we render the player's own wallet and two placeholder slots. No
 * hard-coded addresses.
 */
export function TeamPicker() {
  const { address, teamName } = useGameWallet()

  const teammates = [
    { address: address ?? 'you', label: 'You', ready: true },
    { address: null, label: 'Open slot', ready: false },
    { address: null, label: 'Open slot', ready: false },
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
              key={`${mate.label}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-body-sm text-paper">{mate.label}</span>
                <Num size="sm" className="text-text-muted">
                  {mate.address ? shortAddress(mate.address) : '—'}
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