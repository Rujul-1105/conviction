'use client'

import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { Card, PanelLabel } from '@/components/ui/card'
import { Num } from '@/components/ui/num'
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
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
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
              <div className="mt-3 space-y-3">
                {isLoading && (
                  <Card className="p-6">
                    <Num className="text-text-muted">Loading proposals…</Num>
                  </Card>
                )}

                {!isLoading && !sorted.length && (
                  <Card className="p-6">
                    <p className="text-body-md text-paper">
                      No proposals yet.
                    </p>
                    <p className="mt-1 text-body-sm text-text-muted">
                      Win a round to earn FTR, then propose a change.
                    </p>
                  </Card>
                )}

                {sorted.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
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
    </div>
  )
}
