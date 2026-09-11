'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PanelLabel } from '@/components/ui/card'
import { api, type Match, type MatchMode, type TokenTier } from '@/lib/api'
import { useMatchStore } from '@/lib/store/match-store'
import { cn } from '@/lib/utils'

/**
 * Create-match modal (DESIGN.md §10 priority 3).
 *
 * Options are constrained to values the program accepts: 2-team matches, a pot
 * in SOL, a duration in seconds, and a tier that filters the token universe.
 * Draft state lives in the match store so it survives re-renders while open.
 */

const MODES: { value: MatchMode; label: string; hint: string }[] = [
  { value: 'classic', label: 'Classic', hint: 'Highest P&L wins' },
  { value: 'reverse', label: 'Reverse', hint: 'Lowest P&L wins' },
  { value: 'contrarian', label: 'Contrarian', hint: 'Fade the villain' },
  { value: 'coop', label: 'Co-op', hint: 'Both villages vs chaos' },
]

const TIERS: (TokenTier | 'mixed')[] = ['safe', 'wild', 'moonshot', 'mixed']
const DURATIONS = [5, 10, 15]
const POTS = [1, 5, 12, 25]

/** Small segmented control — used for every field in this form. */
function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
}) {
  return (
    <div>
      <PanelLabel>{label}</PanelLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-body-sm transition-colors',
              option === value
                ? 'border-conviction bg-conviction/10 text-conviction'
                : 'border-border bg-surface text-text-muted hover:text-paper',
            )}
          >
            {format ? format(option) : String(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CreateMatchModal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { draftMode, draftTier, draftPot, draftDuration, setDraft } =
    useMatchStore()

  const create = useMutation({
    mutationFn: (params: Partial<Match>) => api.createMatch(params),
    onSuccess: async (match) => {
      await queryClient.invalidateQueries({ queryKey: ['matches', 'open'] })
      setOpen(false)
      toast.success('Match created', { description: 'Pick your basket to start.' })
      router.push(`/match/${match.id}/setup`)
    },
    onError: () => toast.error('Could not create the match'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">Create match</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a match</DialogTitle>
          <DialogDescription>
            Two villages, one pot. Settings are locked once the round starts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Choice
            label="Mode"
            options={MODES.map((m) => m.value)}
            value={draftMode}
            onChange={(draftMode) => setDraft({ draftMode })}
            format={(v) => MODES.find((m) => m.value === v)!.label}
          />
          <p className="-mt-3 text-body-sm text-text-muted">
            {MODES.find((m) => m.value === draftMode)?.hint}
          </p>

          <Choice
            label="Token tier"
            options={TIERS}
            value={draftTier}
            onChange={(draftTier) => setDraft({ draftTier })}
          />

          <Choice
            label="Pot"
            options={POTS}
            value={draftPot}
            onChange={(draftPot) => setDraft({ draftPot })}
            format={(v) => `${v} SOL`}
          />

          <Choice
            label="Duration"
            options={DURATIONS}
            value={draftDuration / 60}
            onChange={(mins) => setDraft({ draftDuration: mins * 60 })}
            format={(v) => `${v}m`}
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                mode: draftMode,
                tier: draftTier,
                pot: draftPot,
                duration: draftDuration,
              })
            }
          >
            {create.isPending ? 'Creating…' : 'Create match'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
