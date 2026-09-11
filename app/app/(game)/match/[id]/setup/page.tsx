'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { SolAmount } from '@/components/ui/num'
import {
  StopLossSlider,
  TeamPicker,
} from '@/components/pre-round/stop-loss-slider'
import { BasketTray, TokenGrid } from '@/components/pre-round/token-grid'
import { api, type TokenTier } from '@/lib/api'
import { useMatch } from '@/lib/hooks/use-matches'
import { useTokenUniverse } from '@/lib/hooks/use-token-universe'
import {
  MAX_BASKET_TOKENS,
  type RoundStep,
  useRoundUIStore,
} from '@/lib/store/round-store'
import { cn } from '@/lib/utils'

/**
 * Pre-round setup (DESIGN.md §10 priority 4).
 *
 * Three steps: Basket, Stop-losses, Team. All state is local (useRoundUIStore)
 * until "Lock in" — which mirrors the program, where basket and thresholds are
 * both arguments to a single `lock_in_pre_round` instruction.
 *
 * The visual register here is deliberately calm (PHASE_B_BRIEF: "pre-round
 * reads like a clean stock app"). The war-room density starts on /live.
 */

const STEPS: { key: RoundStep; label: string }[] = [
  { key: 'basket', label: 'Basket' },
  { key: 'stoploss', label: 'Stop-losses' },
  { key: 'team', label: 'Team' },
]

export default function SetupPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: match } = useMatch(params.id)
  const { data: tokens } = useTokenUniverse()
  const { step, setStep, selectedBasketTokens, basketStopLossBand, reset } =
    useRoundUIStore()
  const [tierFilter, setTierFilter] = useState<TokenTier | 'all'>('all')

  // Fresh wizard per match — a leftover basket from another match would
  // silently carry over otherwise.
  useEffect(() => {
    reset()
  }, [params.id, reset])

  // Default the tier filter to the match's tier, so the grid opens on the
  // tokens this match actually allows.
  useEffect(() => {
    if (match && match.tier !== 'mixed') setTierFilter(match.tier)
  }, [match])

  const basketComplete = selectedBasketTokens.length === MAX_BASKET_TOKENS

  const lockIn = useMutation({
    mutationFn: async () => {
      const chosen = (tokens ?? []).filter((t) =>
        selectedBasketTokens.includes(t.mint),
      )
      await api.setBasket(params.id, {
        tokens: chosen,
        band: basketStopLossBand,
      })
      await api.lockInPicks(params.id)
    },
    onSuccess: () => {
      setStep('locked')
      toast.success('Locked in', { description: 'Sealed until reveal.' })
      router.push(`/match/${params.id}/live`)
    },
    onError: () => toast.error('Lock-in failed'),
  })

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PageBackdrop>
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />

        <main className="flex-1 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <PanelLabel>
                Round {match?.roundNumber ?? '—'} · {match?.mode ?? 'classic'}
              </PanelLabel>
              <h1 className="mt-1 font-display text-heading-lg font-bold text-paper">
                Set your position
              </h1>
            </div>
            {match && (
              <div className="text-right">
                <PanelLabel>Pot</PanelLabel>
                <SolAmount value={match.pot} size="xl" className="block" />
              </div>
            )}
          </div>

          {/* Stepper. Completed steps are green, current is paper, future muted. */}
          <div className="mt-8 flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = i < stepIndex
              const current = i === stepIndex
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(s.key)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-1.5 text-body-sm transition-colors',
                      done && 'border-conviction/30 bg-conviction/10 text-conviction',
                      current && 'border-paper/30 bg-surface-elevated text-paper',
                      !done && !current && 'border-border text-whisper',
                    )}
                  >
                    {done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="font-mono text-label">{i + 1}</span>
                    )}
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="h-px w-6 bg-border" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="p-4">
              {step === 'basket' && tokens && (
                <TokenGrid
                  tokens={tokens}
                  tierFilter={tierFilter}
                  onTierChange={setTierFilter}
                />
              )}
              {step === 'stoploss' && <StopLossSlider />}
              {(step === 'team' || step === 'locked') && <TeamPicker />}
            </Card>

            <aside className="space-y-4">
              {tokens && <BasketTray tokens={tokens} />}

              <div className="space-y-2">
                {step === 'basket' && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!basketComplete}
                    onClick={() => setStep('stoploss')}
                  >
                    {basketComplete
                      ? 'Set stop-losses'
                      : `Pick ${MAX_BASKET_TOKENS - selectedBasketTokens.length} more`}
                  </Button>
                )}

                {step === 'stoploss' && (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => setStep('team')}
                    >
                      Confirm thresholds
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full"
                      onClick={() => setStep('basket')}
                    >
                      Back to basket
                    </Button>
                  </>
                )}

                {step === 'team' && (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={lockIn.isPending}
                      onClick={() => lockIn.mutate()}
                    >
                      {lockIn.isPending ? 'Locking in…' : 'Lock in'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full"
                      onClick={() => setStep('stoploss')}
                    >
                      Back to stop-losses
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
      </PageBackdrop>
    </div>
  )
}
