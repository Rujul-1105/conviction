import { create } from 'zustand'

/** Pre-round wizard steps, in order. */
export type RoundStep = 'basket' | 'stoploss' | 'team' | 'locked'

/** Max positions per basket — matches the on-chain `mints: [Pubkey; 3]`. */
export const MAX_BASKET_TOKENS = 3

/** Default basket-band edges when the player enters the stop-loss step. */
export const DEFAULT_STOP_LOSS_BAND = { minBps: -1500, maxBps: -300 }

/** Hard limits on the basket-band slider, in bps. Both clamped to negative. */
export const STOP_LOSS_BAND_LIMITS = { minBps: -4000, maxBps: -100 }

/**
 * Pre-round UI state (DESIGN.md §8).
 *
 * Everything here is intentionally local until the player hits "Lock in".
 * That mirrors the program: there are no setBasket/setStopLoss instructions —
 * basket and stop-loss are both arguments to `lock_in_pre_round`, so holding
 * them client-side until then is correct, not a shortcut.
 *
 * `basketStopLossBand` is a single bps range shared across the whole basket
 * to match the on-chain `StopLossRange { min_bps, max_bps }`. The brief
 * calls for whole-basket rules — when the worst-performer breaks out of
 * the band, the whole team auto-folds.
 */
interface RoundUIState {
  selectedBasketTokens: string[]
  /** Single bps band applied to the whole basket (negative). */
  basketStopLossBand: { minBps: number; maxBps: number }
  step: RoundStep
  setStep: (step: RoundStep) => void
  toggleToken: (mint: string) => void
  setStopLossBand: (band: { minBps: number; maxBps: number }) => void
  reset: () => void
}

export const useRoundUIStore = create<RoundUIState>((set) => ({
  selectedBasketTokens: [],
  basketStopLossBand: DEFAULT_STOP_LOSS_BAND,
  step: 'basket',

  setStep: (step) => set({ step }),

  toggleToken: (mint) =>
    set((s) => {
      const isSelected = s.selectedBasketTokens.includes(mint)
      if (isSelected) {
        return {
          selectedBasketTokens: s.selectedBasketTokens.filter((m) => m !== mint),
        }
      }
      // Silently ignore picks past the cap rather than replacing an existing
      // one — surprising the player by evicting a token would be worse.
      if (s.selectedBasketTokens.length >= MAX_BASKET_TOKENS) return s
      return {
        selectedBasketTokens: [...s.selectedBasketTokens, mint],
      }
    }),

  // Clamp inputs to the documented limits and enforce min < max so the
  // band is never inverted. Out-of-range inputs silently snap rather than
  // throw — sliders shouldn't error in the middle of a drag.
  setStopLossBand: (band) =>
    set(() => {
      const { minBps: lo, maxBps: hi } = STOP_LOSS_BAND_LIMITS
      let minBps = Math.min(Math.max(band.minBps, lo), -1)
      let maxBps = Math.min(Math.max(band.maxBps, hi), -1)
      if (minBps > maxBps) [minBps, maxBps] = [maxBps, minBps]
      return { basketStopLossBand: { minBps, maxBps } }
    }),

  reset: () =>
    set({
      selectedBasketTokens: [],
      basketStopLossBand: DEFAULT_STOP_LOSS_BAND,
      step: 'basket',
    }),
}))