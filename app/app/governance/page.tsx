'use client'

import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { PageBackdrop } from '@/components/layout/page-backdrop'
import { Card, PanelLabel } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FtrBalancePanel,
  ProposalCard,
} from '@/components/governance/proposal-card'
import { ProposeModal } from '@/components/governance/propose-modal'
import { useProposals } from '@/lib/hooks/use-proposals'
import { useGameWallet } from '@/lib/hooks/use-wallet'

/**
 * Governance (DESIGN.md §10 priority 8).
 *
 * FTR balance leads in large conviction green, then the proposal list. Open
 * proposals sort first — those are the only ones a player can act on.
 *
 * Phase 8 polish:
 *  - Empty state copy becomes agency-grade: "HOLD . RESIST . SURVIVE.
 *    — propose the first rule change."
 *  - Proposal list wrapped in <ScrollArea> so a long history doesn't push
 *    the page; Skeleton rows render during the initial fetch.
 */
export default function GovernancePage() {
  const { data: proposals, isLoading } = useProposals()
  const { ftrBalance, connected } = useGameWallet()

  const sorted = [...(proposals ?? [])].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1
    if (b.status === 'open' && a.status !== 'open') return 1
    return b.deadline - a.deadline
  })

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <PageBackdrop>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 lg:px-8">
        <LeftRail />

        <main className="min-w-0 flex-1 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-heading-lg font-bold text-paper">
                Governance
              </h1>
              <p className="mt-1 text-body-md text-text-muted">
                Winning villages write the rules of the next round.
              </p>
            </div>
            <ProposeModal ftrBalance={ftrBalance} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section>
              <PanelLabel>Proposals</PanelLabel>

              {isLoading && (
                // Three Skeleton rows replace a generic "Loading proposals…".
                <div className="mt-3 space-y-3">
                  <Skeleton className="h-[120px] w-full rounded-md" />
                  <Skeleton className="h-[120px] w-full rounded-md" />
                  <Skeleton className="h-[120px] w-full rounded-md" />
                </div>
              )}

              {!isLoading && !sorted.length && (
                <Card className="mt-3 p-6">
                  <p className="font-mono text-label uppercase text-whisper">
                    HOLD . RESIST . SURVIVE.
                  </p>
                  <p className="mt-2 text-body-md text-paper">
                    Propose the first rule change.
                  </p>
                  <p className="mt-1 text-body-sm text-text-muted">
                    Win a round to earn FTR, then propose a change.
                  </p>
                </Card>
              )}

              {!!sorted.length && (
                // Proposal list in <ScrollArea> so the rail stays in view
                // even after dozens of settled proposals.
                <ScrollArea className="mt-3 h-[640px] pr-2">
                  <div className="space-y-3">
                    {sorted.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </section>

            <aside className="space-y-4">
              <FtrBalancePanel balance={ftrBalance} />
              {!connected && (
                <Card className="p-4">
                  <p className="text-body-sm text-text-muted">
                    Connect a wallet to vote. Weight comes from your FTR balance.
                  </p>
                </Card>
              )}
            </aside>
          </div>
        </main>
      </div>
      </PageBackdrop>
    </div>
  )
}