'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import { StatusPill } from '@/components/ui/status-pill'
import type { SpectatorBetType, Team } from '@/lib/api'
import { usePlaceBet, useSpectatorBets } from '@/lib/hooks/use-proposals'
import { cn, shortAddress } from '@/lib/utils'

/**
 * Spectator prediction panel (DESIGN.md §10 priority 7).
 *
 * Sealed-bid: the prediction is hashed on chain (`SpectatorBid.prediction_hash`
 * is a [u8; 32]) so nobody can front-run it, and the plaintext is only revealed
 * by preimage after the round. Everything here is volatility purple — DESIGN.md
 * §1 reserves that colour for the spectator class, and every spectator element
 * must use it.
 */

const BET_TYPES: { value: SpectatorBetType; label: string; hint: string }[] = [
  { value: 'first_fold', label: 'First to fold', hint: 'Name the village that breaks first' },
  { value: 'last_holding', label: 'Last holding', hint: 'Name the village that survives' },
  { value: 'chaos_count', label: 'Chaos count', hint: 'How many events fire this round' },
  { value: 'perfect_round', label: 'Perfect round', hint: 'Nobody folds at all' },
]

const AMOUNTS = [5, 10, 25, 50]

export function PredictionPanel({
  matchId,
  teams,
}: {
  matchId: string
  teams: Team[]
}) {
  const { data: bets } = useSpectatorBets(matchId)
  const placeBet = usePlaceBet(matchId)

  const [betType, setBetType] = useState<SpectatorBetType>('first_fold')
  const [prediction, setPrediction] = useState<string>(teams[0]?.name ?? '')
  const [amount, setAmount] = useState(10)

  // Which options make sense depends on the bet type.
  const options =
    betType === 'chaos_count'
      ? ['0', '1', '2', '3 or more']
      : betType === 'perfect_round'
        ? ['Yes, nobody folds', 'No, someone folds']
        : teams.map((t) => t.name)

  // Keep the prediction valid whenever the type changes.
  const activePrediction = options.includes(prediction) ? prediction : options[0]

  return (
    <Card className="border-volatility/30 p-4">
      <div className="flex items-center justify-between">
        <PanelLabel className="text-volatility">Sealed prediction</PanelLabel>
        <StatusPill variant="spectating" dot>
          {bets?.length ?? 0} bids
        </StatusPill>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <PanelLabel>Market</PanelLabel>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BET_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setBetType(type.value)}
                className={cn(
                  'rounded-md border p-2 text-left transition-colors',
                  type.value === betType
                    ? 'border-volatility bg-volatility/10 text-volatility'
                    : 'border-border text-text-muted hover:text-paper',
                )}
              >
                <span className="block text-body-sm">{type.label}</span>
                <span className="block text-body-sm text-whisper">
                  {type.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <PanelLabel>Your call</PanelLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPrediction(option)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-body-sm transition-colors',
                  option === activePrediction
                    ? 'border-volatility bg-volatility/10 text-volatility'
                    : 'border-border text-text-muted hover:text-paper',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <PanelLabel>Stake (USDC)</PanelLabel>
          <div className="mt-2 flex gap-2">
            {AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={cn(
                  'rounded-md border px-3 py-1.5 transition-colors',
                  value === amount
                    ? 'border-volatility bg-volatility/10 text-volatility'
                    : 'border-border text-text-muted hover:text-paper',
                )}
              >
                <Num size="sm">{value}</Num>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-volatility/30 bg-volatility/10 p-3">
          <Lock className="h-4 w-4 shrink-0 text-volatility" />
          <p className="text-body-sm text-text-muted">
            Only a hash of your prediction goes on chain. Nobody can read or
            copy your call until the round settles.
          </p>
        </div>

        <Button
          variant="spectator"
          size="lg"
          className="w-full"
          disabled={placeBet.isPending}
          onClick={() =>
            placeBet.mutate(
              { matchId, type: betType, prediction: activePrediction, amount },
              {
                onSuccess: () =>
                  toast.success('Prediction sealed', {
                    description: `${activePrediction} · ${amount} USDC`,
                  }),
                onError: () => toast.error('Could not place prediction'),
              },
            )
          }
        >
          {placeBet.isPending ? 'Sealing…' : `Seal ${amount} USDC`}
        </Button>
      </div>

      {!!bets?.length && (
        <div className="mt-4 border-t border-border pt-3">
          <PanelLabel>Open bids</PanelLabel>
          <div className="mt-2 space-y-1">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between gap-2"
              >
                <Num size="sm" className="text-text-muted">
                  {shortAddress(bet.bettorWallet)}
                </Num>
                <div className="flex items-center gap-2">
                  <Num size="sm" className="text-paper">
                    {bet.amount} USDC
                  </Num>
                  <StatusPill
                    variant={
                      bet.status === 'won'
                        ? 'conviction'
                        : bet.status === 'lost'
                          ? 'folded'
                          : 'spectating'
                    }
                  >
                    {bet.status}
                  </StatusPill>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
