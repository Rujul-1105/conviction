'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
import type { ProposalParameter } from '@/lib/api'
import { useCreateProposal } from '@/lib/hooks/use-proposals'
import { cn } from '@/lib/utils'

/**
 * Propose-a-change modal (DESIGN.md §10 priority 8).
 *
 * Parameters and their allowed values mirror what `propose_param_change` can
 * express on chain: a 32-byte param name and a single u32 value. That's why
 * every option below is a discrete integer choice rather than a free-text
 * field — anything richer couldn't be encoded.
 */

const PARAMS: {
  value: ProposalParameter
  label: string
  current: number
  options: number[]
  format: (v: number) => string
}[] = [
  {
    value: 'duration',
    label: 'Round duration',
    current: 900,
    options: [300, 600, 900, 1200],
    format: (v) => `${Math.round(v / 60)}m`,
  },
  {
    value: 'chaos_count',
    label: 'Chaos events per round',
    current: 3,
    options: [0, 1, 3, 5],
    format: (v) => String(v),
  },
  {
    value: 'pot',
    label: 'Base pot',
    current: 5,
    options: [1, 5, 12, 25],
    format: (v) => `${v} SOL`,
  },
  {
    value: 'penalty',
    label: 'Fold penalty',
    current: 10,
    options: [0, 10, 25, 50],
    format: (v) => `${v}%`,
  },
]

export function ProposeModal({ ftrBalance }: { ftrBalance: number }) {
  const [open, setOpen] = useState(false)
  const [paramIndex, setParamIndex] = useState(0)
  const [proposedValue, setProposedValue] = useState(PARAMS[0].options[0])
  const [isPrivate, setIsPrivate] = useState(false)

  const createProposal = useCreateProposal()
  const param = PARAMS[paramIndex]

  // Proposing requires FTR — the program gates on the proposer's balance.
  const canPropose = ftrBalance > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" disabled={!canPropose}>
          Propose change
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Propose a rule change"
        description="If it passes by FTR weight, it applies to every round in the season."
      >
        <div className="space-y-5">
          <div>
            <PanelLabel>Parameter</PanelLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PARAMS.map((p, i) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setParamIndex(i)
                    // Reset the value so it can't carry over from another param.
                    setProposedValue(p.options[0])
                  }}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left text-body-sm transition-colors',
                    i === paramIndex
                      ? 'border-conviction bg-conviction/10 text-conviction'
                      : 'border-border text-text-muted hover:text-paper',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <PanelLabel>
              Change from {param.format(param.current)} to
            </PanelLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {param.options
                .filter((v) => v !== param.current)
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProposedValue(value)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 transition-colors',
                      value === proposedValue
                        ? 'border-conviction bg-conviction/10 text-conviction'
                        : 'border-border text-text-muted hover:text-paper',
                    )}
                  >
                    <Num size="sm">{param.format(value)}</Num>
                  </button>
                ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-volatility"
            />
            <span className="text-body-sm">
              <span className="text-paper">Seal the vote tally</span>
              <span className="mt-0.5 block text-text-muted">
                Individual votes stay hidden in a Permissioned Ephemeral Rollup
                until the proposal is tallied.
              </span>
            </span>
          </label>

          <div className="rounded-md border border-border p-3">
            <PanelLabel>Your weight</PanelLabel>
            <Num size="lg" className="mt-0.5 block text-conviction">
              {ftrBalance.toLocaleString('en-US')} FTR
            </Num>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={createProposal.isPending}
            onClick={() =>
              createProposal.mutate(
                {
                  proposerTeamId: 'team-1',
                  parameter: param.value,
                  currentValue: param.current,
                  proposedValue,
                  // 24h voting window, matching the on-chain deadline_slot idea.
                  deadline: Date.now() + 24 * 60 * 60 * 1000,
                  isPrivate,
                },
                {
                  onSuccess: () => {
                    setOpen(false)
                    toast.success('Proposal submitted')
                  },
                  onError: () => toast.error('Could not submit the proposal'),
                },
              )
            }
          >
            {createProposal.isPending ? 'Submitting…' : 'Submit proposal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
