import { create } from 'zustand'

/** Pre-round wizard steps, in order. */
export type RoundStep = 'basket' | 'stoploss' | 'team' | 'locked'

/** Max positions per basket — matches the on-chain `mints: [Pubkey; 3]`. */
export const MAX_BASKET_TOKENS = 3

/** Default stop-loss when a token is first added, in percent (negative). */
export const DEFAULT_STOP_LOSS = -10

/**
 * Pre-round UI state (DESIGN.md §8).
 *
 * Everything here is intentionally local until the player hits "Lock in".
 * That mirrors the program: there are no setBasket/setStopLoss instructions —
 * basket and stop-losses are both arguments to `lock_in_pre_round`, so holding
 * them client-side until then is correct, not a shortcut.
 */
interface RoundUIState {
  selectedBasketTokens: string[]
  /** mint -> threshold percent (negative). */
  stopLosses: Record<string, number>
  step: RoundStep
  setStep: (step: RoundStep) => void
  toggleToken: (mint: string) => void
  setStopLoss: (mint: string, pct: number) => void
  reset: () => void
}

export const useRoundUIStore = create<RoundUIState>((set) => ({
  selectedBasketTokens: [],
  stopLosses: {},
  step: 'basket',

  setStep: (step) => set({ step }),

  toggleToken: (mint) =>
    set((s) => {
      const isSelected = s.selectedBasketTokens.includes(mint)

      if (isSelected) {
        // Deselecting drops the token's stop-loss too, so a stale threshold
        // can't survive for a token that's no longer in the basket.
        const { [mint]: _removed, ...rest } = s.stopLosses
        return {
          selectedBasketTokens: s.selectedBasketTokens.filter((m) => m !== mint),
          stopLosses: rest,
        }
      }

      // Silently ignore picks past the cap rather than replacing an existing
      // one — surprising the player by evicting a token would be worse.
      if (s.selectedBasketTokens.length >= MAX_BASKET_TOKENS) return s

      return {
        selectedBasketTokens: [...s.selectedBasketTokens, mint],
        stopLosses: { ...s.stopLosses, [mint]: DEFAULT_STOP_LOSS },
      }
    }),

  setStopLoss: (mint, pct) =>
    set((s) => ({ stopLosses: { ...s.stopLosses, [mint]: pct } })),

  reset: () => set({ selectedBasketTokens: [], stopLosses: {}, step: 'basket' }),
}))
