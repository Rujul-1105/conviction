'use client'

import Link from 'next/link'
import { LeftRail } from '@/components/layout/left-rail'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'
import { Num } from '@/components/ui/num'
import { RevealSequence } from '@/components/reveal/reveal-sequence'
import { useMatch } from '@/lib/hooks/use-matches'
import { useGameWallet } from '@/lib/hooks/use-wallet'

/**
 * Reveal screen (DESIGN.md §10 priority 6).
 *
 * Note the route is /reveal/[id], NOT /match/[id]/reveal — DESIGN.md §2 puts it
 * at (game)/reveal/[id], and §14 says not to invent new file structures. This
 * supersedes the flat route listed in docs/PLAN.md.
 */
export default function RevealPage({ params }: { params: { id: string } }) {
  const { data: match, isLoading } = useMatch(params.id)
  const { teamName } = useGameWallet()

  // Only the winning village can propose a rule change (FTR-gated on chain).
  const ranked = match
    ? [...match.teams].sort((a, b) => {
        const aFolded = a.status === 'folded' ? 1 : 0
        const bFolded = b.status === 'folded' ? 1 : 0
        if (aFolded !== bFolded) return aFolded - bFolded
        return b.pnl - a.pnl
      })
    : []
  const playerWon = ranked[0]?.name === teamName

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="mx-auto flex w-full max-w-content flex-1 gap-6 px-4">
        <LeftRail />

        <main className="min-w-0 flex-1 py-8">
          {isLoading && (
            <Num className="text-text-muted">Settling the round…</Num>
          )}

          {!isLoading && !match && (
            <div className="py-16 text-center">
              <p className="text-body-lg text-paper">Match not found.</p>
              <Link href="/lobby" className="mt-4 inline-block">
                <Button variant="secondary">Back to lobby</Button>
              </Link>
            </div>
          )}

          {match && (
            <>
              <RevealSequence match={match} />

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/lobby">
                  <Button variant="primary" size="lg">
                    Join the next round
                  </Button>
                </Link>
                {playerWon && (
                  <Link href="/governance">
                    <Button variant="secondary" size="lg">
                      Propose a rule change
                    </Button>
                  </Link>
                )}
                <Link href="/leaderboard">
                  <Button variant="ghost" size="lg">
                    See standings
                  </Button>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
