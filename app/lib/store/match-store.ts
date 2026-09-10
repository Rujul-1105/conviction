import { create } from 'zustand'
import type { MatchMode, TokenTier } from '@/lib/api'

/**
 * Match-creation form state and transient live-round UI flags (DESIGN.md §8).
 *
 * None of this is on-chain. The create-match draft lives here so the lobby
 * modal survives a re-render, and the chaos-banner flag lives here so the live
 * screen can flash a banner without re-fetching anything.
 */
interface MatchState {
  // ── Create-match draft ──
  draftMode: MatchMode
  draftTier: TokenTier | 'mixed'
  /** SOL. */
  draftPot: number
  /** Seconds. */
  draftDuration: number
  setDraft: (draft: Partial<Pick<
    MatchState,
    'draftMode' | 'draftTier' | 'draftPot' | 'draftDuration'
  >>) => void
  resetDraft: () => void

  // ── Live-round transient UI ──
  /** Message for the chaos banner; null hides it. Chaos flashes, never sits. */
  activeChaos: string | null
  showChaos: (message: string) => void
  clearChaos: () => void
}

const DRAFT_DEFAULTS = {
  draftMode: 'classic' as MatchMode,
  draftTier: 'wild' as TokenTier | 'mixed',
  draftPot: 5,
  draftDuration: 15 * 60,
}

export const useMatchStore = create<MatchState>((set) => ({
  ...DRAFT_DEFAULTS,

  setDraft: (draft) => set(draft),
  resetDraft: () => set(DRAFT_DEFAULTS),

  activeChaos: null,
  showChaos: (message) => set({ activeChaos: message }),
  clearChaos: () => set({ activeChaos: null }),
}))
