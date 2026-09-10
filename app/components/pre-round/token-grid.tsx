'use client'

import { Check } from 'lucide-react'
import { Num, Pnl, Price } from '@/components/ui/num'
import { PanelLabel } from '@/components/ui/card'
import type { Token, TokenTier } from '@/lib/api'
import { MAX_BASKET_TOKENS, useRoundUIStore } from '@/lib/store/round-store'
import { cn } from '@/lib/utils'

/**
 * Token grid for basket selection (DESIGN.md §10 priority 4).
 *
 * Selection is capped at 3 to match the on-chain `Basket.mints: [Pubkey; 3]`.
 * Past the cap, unselected tiles go visibly inert rather than silently
 * ignoring clicks — the store refuses the pick, so the UI must explain why.
 */

const TIER_LABEL: Record<TokenTier, string> = {
  safe: 'Safe',
  wild: 'Wild',
  moonshot: 'Moonshot',
}

const TIER_CLASS: Record<TokenTier, string> = {
  safe: 'text-hold',
  wild: 'text-chaos',
  moonshot: 'text-fold',
}

export function TokenGrid({
  tokens,
  tierFilter,
  onTierChange,
}: {
  tokens: Token[]
  tierFilter: TokenTier | 'all'
  onTierChange: (tier: TokenTier | 'all') => void
}) {
  const { selectedBasketTokens, toggleToken } = useRoundUIStore()
  const atCap = selectedBasketTokens.length >= MAX_BASKET_TOKENS

  const visible =
    tierFilter === 'all' ? tokens : tokens.filter((t) => t.tier === tierFilter)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelLabel>
          Pick {MAX_BASKET_TOKENS} — {selectedBasketTokens.length} selected
        </PanelLabel>

        <div className="flex gap-2">
          {(['all', 'safe', 'wild', 'moonshot'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onTierChange(tier)}
              className={cn(
                'rounded-md border px-2.5 py-1 font-mono text-label uppercase transition-colors',
                tier === tierFilter
                  ? 'border-paper/30 bg-surface-elevated text-paper'
                  : 'border-border text-whisper hover:text-paper',
              )}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((token) => {
          const selected = selectedBasketTokens.includes(token.mint)
          const disabled = !selected && atCap

          return (
            <button
              key={token.mint}
              type="button"
              disabled={disabled}
              onClick={() => toggleToken(token.mint)}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                selected
                  ? 'border-conviction bg-conviction/10'
                  : 'border-border bg-surface hover:bg-surface-elevated',
                disabled && 'cursor-not-allowed opacity-40 hover:bg-surface',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-body-md font-bold text-paper">
                  {token.symbol}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-conviction" />
                ) : (
                  <span
                    className={cn(
                      'font-mono text-label uppercase',
                      TIER_CLASS[token.tier],
                    )}
                  >
                    {TIER_LABEL[token.tier]}
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-body-sm text-text-muted">
                {token.name}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2">
                <Price value={token.currentPrice} size="sm" />
                <Pnl value={token.priceChange24h} size="sm" />
              </div>
            </button>
          )
        })}
      </div>

      {atCap && (
        <p className="mt-3 text-body-sm text-text-muted">
          Basket is full. Deselect a token to swap it out.
        </p>
      )}
    </div>
  )
}

/** Running summary of the current basket. Shown alongside every wizard step. */
export function BasketTray({ tokens }: { tokens: Token[] }) {
  const { selectedBasketTokens, basketStopLossBand, toggleToken } =
    useRoundUIStore()
  const selected = selectedBasketTokens
    .map((mint) => tokens.find((t) => t.mint === mint))
    .filter((t): t is Token => Boolean(t))

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <PanelLabel>Your basket</PanelLabel>

      <div className="mt-3 space-y-2">
        {Array.from({ length: MAX_BASKET_TOKENS }).map((_, i) => {
          const token = selected[i]
          if (!token) {
            return (
              <div
                key={`empty-${i}`}
                className="flex h-[52px] items-center rounded-md border border-dashed border-border px-3"
              >
                <span className="font-mono text-label uppercase text-whisper">
                  Slot {i + 1} empty
                </span>
              </div>
            )
          }

          const band = basketStopLossBand
          return (
            <div
              key={token.mint}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-display text-body-md font-bold text-paper">
                  {token.symbol}
                </span>
                <div className="flex items-center gap-2">
                  <Price value={token.currentPrice} size="sm" />
                  <Num size="sm" className="text-whisper">
                    band {(band.minBps / 100).toFixed(1)}% …
                    {(band.maxBps / 100).toFixed(1)}%
                  </Num>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleToken(token.mint)}
                className="shrink-0 font-mono text-label uppercase text-whisper transition-colors hover:text-fold"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
