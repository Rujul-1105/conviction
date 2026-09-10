'use client'

import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { Ftr, Num } from '@/components/ui/num'
import { StatusPill, type StatusVariant } from '@/components/ui/status-pill'
import type { Proposal, ProposalParameter, ProposalStatus } from '@/lib/api'
import { useVote } from '@/lib/hooks/use-proposals'
import { cn, timeAgo } from '@/lib/utils'

/**
 * Proposal card (DESIGN.md §10 priority 8).
 *
 * Votes are FTR-weighted, not one-per-wallet, so the tally renders as a
 * proportional bar rather than a count — weight is the thing that matters.
 */

const PARAM_LABEL: Record<ProposalParameter, string> = {
  duration: 'Round duration',
  pot: 'Pot size',
  penalty: 'Fold penalty',
  chaos_count: 'Chaos events per round',
  token_universe: 'Token universe',
  mode: 'Default mode',
}

const STATUS_VARIANT: Record<ProposalStatus, StatusVariant> = {
  open: 'holding',
  passed: 'conviction',
  failed: 'folded',
  executed: 'conviction',
}

/** Format a value with its unit, since the raw numbers are unitless. */
function formatValue(param: ProposalParameter, value: string | number): string {
  if (typeof value === 'string') return value
  if (param === 'duration') return `${Math.round(value / 60)}m`
  if (param === 'pot') return `${value} SOL`
  return String(value)
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const vote = useVote()
  const isOpen = proposal.status === 'open'

  const total = proposal.votesYes + proposal.votesNo
  const yesPct = total > 0 ? (proposal.votesYes / total) * 100 : 0

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PanelLabel>{PARAM_LABEL[proposal.parameter]}</PanelLabel>
            {proposal.isPrivate && (
              // lucide icons don't take `title`; wrap for the tooltip + a11y name.
              <span title="Sealed vote" aria-label="Sealed vote">
                <Lock className="h-3 w-3 text-volatility" />
              </span>
            )}
          </div>

          <p className="mt-1 font-display text-heading-sm font-bold text-paper">
            <span className="text-text-muted line-through">
              {formatValue(proposal.parameter, proposal.currentValue)}
            </span>
            {' → '}
            <span>{formatValue(proposal.parameter, proposal.proposedValue)}</span>
          </p>
        </div>

        <StatusPill variant={STATUS_VARIANT[proposal.status]}>
          {proposal.status}
        </StatusPill>
      </div>

      {/* Tally bar. Green for yes, red for no — no gradient, just two blocks. */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Num size="sm" className="text-conviction">
              {proposal.votesYes.toLocaleString('en-US')}
            </Num>
            <span className="font-mono text-label uppercase text-whisper">
              for
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-label uppercase text-whisper">
              against
            </span>
            <Num size="sm" className="text-fold">
              {proposal.votesNo.toLocaleString('en-US')}
            </Num>
          </div>
        </div>

        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-sm bg-border">
          <div className="bg-conviction" style={{ width: `${yesPct}%` }} />
          <div className="flex-1 bg-fold" />
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <Num size="sm" className="text-whisper">
            {total.toLocaleString('en-US')} FTR voted
          </Num>
          <Num size="sm" className="text-whisper">
            {isOpen
              ? `closes ${new Date(proposal.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
              : `closed ${timeAgo(proposal.deadline)}`}
          </Num>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 flex gap-3">
          {(['yes', 'no'] as const).map((support) => (
            <Button
              key={support}
              variant={support === 'yes' ? 'primary' : 'danger'}
              size="md"
              className="flex-1"
              disabled={vote.isPending}
              onClick={() =>
                vote.mutate(
                  { proposalId: proposal.id, support, isPrivate: false },
                  {
                    onSuccess: () =>
                      toast.success(
                        support === 'yes' ? 'Voted for' : 'Voted against',
                      ),
                    onError: () => toast.error('Vote failed'),
                  },
                )
              }
            >
              {support === 'yes' ? 'Vote for' : 'Vote against'}
            </Button>
          ))}
        </div>
      )}

      {!isOpen && (
        <p className={cn('mt-4 text-body-sm text-text-muted')}>
          {proposal.status === 'passed'
            ? 'This change is live in the current season.'
            : 'This change was rejected by FTR weight.'}
        </p>
      )}
    </Card>
  )
}

/** Large FTR balance readout — the one place green on a number is right. */
export function FtrBalancePanel({ balance }: { balance: number }) {
  return (
    <Card className="p-6">
      <PanelLabel>Your voting weight</PanelLabel>
      <Ftr value={balance} className="mt-2 block text-display-lg leading-none" />
      <p className="mt-3 text-body-sm text-text-muted">
        FTR is minted when your village survives a round. Every vote is weighted
        by balance, so winning is what buys influence.
      </p>
    </Card>
  )
}
