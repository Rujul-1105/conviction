'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Recents — the CommandPalette's "HOLD . RESIST . SURVIVE." group.
 *
 * Persisted to localStorage so the most-recently-visited match survives a
 * reload (per the plan's verification check #13). Capped at 5 entries — a
 * longer history dilutes the affordance.
 *
 * The store does not know about router state directly. Consumers (typically
 * the route change effect inside the live layout) call `record()` when a
 * match is opened.
 */
export interface RecentMatch {
  /** Match id (used in `/match/[id]/setup` etc.) */
  id: string
  /** Display label shown in the palette */
  label: string
  /** Mode chip — Classic / Reverse / Contrarian / Co-op */
  mode?: string
  /** Last visited timestamp (ms) */
  ts: number
}

interface RecentsState {
  recents: RecentMatch[]
  record: (entry: Omit<RecentMatch, 'ts'>) => void
  clear: () => void
}

const MAX_RECENTS = 5

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      recents: [],
      record: (entry) =>
        set((state) => {
          const next = [
            { ...entry, ts: Date.now() },
            ...state.recents.filter((r) => r.id !== entry.id),
          ].slice(0, MAX_RECENTS)
          return { recents: next }
        }),
      clear: () => set({ recents: [] }),
    }),
    { name: 'conviction.recents.v1' },
  ),
)
