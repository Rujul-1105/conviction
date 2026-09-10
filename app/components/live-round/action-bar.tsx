'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, PanelLabel } from '@/components/ui/card'
import { Pnl } from '@/components/ui/num'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { api, type Team } from '@/lib/api'
import { foldFlash, motionSafe } from '@/lib/motion'

/**
 * Action bar — Hold / Fold (DESIGN.md §10 priority 5).
 *
 * Folding is irreversible and loses the pot, so it goes through a confirmation
 * dialog. "Hold" is deliberately NOT a button that does anything: holding is
 * the default state, and giving it a button would imply an action is required.
 * It's a readout instead.
 *
 * NOTE: there is no fold instruction on chain (see lib/api/real.ts) — folding
 * currently only happens via stop-loss or finalize_round. A manual fold needs
 * a new instruction before this can be wired.
 */
export function ActionBar({
  matchId,
  team,
}: {
  matchId: string
  team: Team | undefined
}) {
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fold = useMutation({
    mutationFn: () => api.fold(matchId),
    onSuccess: async () => {
      setConfirmOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      await queryClient.invalidateQueries({ queryKey: ['leaderboard', matchId] })
      await queryClient.invalidateQueries({ queryKey: ['round', matchId] })
      toast.error('You folded', { description: 'Your round is over.' })
    },
    onError: () => toast.error('Fold failed'),
  })

  const hasFolded = team?.status === 'folded'

  return (
    <>
      <motion.div
        // Red ring pulse on fold. Transient — it resolves to transparent.
        variants={motionSafe(foldFlash, reduced)}
        initial="initial"
        animate={hasFolded ? 'flash' : 'initial'}
      >
        <Card className="flex flex-wrap items-center gap-4 p-4">
          <div>
            <PanelLabel>Your position</PanelLabel>
            <Pnl value={team?.pnl ?? 0} size="xl" className="block" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {hasFolded ? (
              <div className="text-right">
                <p className="text-body-md text-fold">You folded</p>
                <p className="text-body-sm text-text-muted">
                  Watch the rest play out.
                </p>
              </div>
            ) : (
              <>
                <div className="text-right">
                  <p className="text-body-md text-hold">Still holding</p>
                  <p className="text-body-sm text-text-muted">
                    Doing nothing is the play.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={() => setConfirmOpen(true)}
                >
                  Fold
                </Button>
              </>
            )}
          </div>
        </Card>
      </motion.div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="Fold your position?"
          description="This cannot be undone. You forfeit your share of the pot and your round ends immediately."
        >
          <div className="space-y-4">
            <div className="rounded-md border border-fold/30 bg-fold/10 p-3">
              <PanelLabel>Locking in a loss of</PanelLabel>
              <Pnl value={team?.pnl ?? 0} size="xl" className="block" />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
              >
                Keep holding
              </Button>
              <Button
                variant="danger"
                size="lg"
                className="flex-1"
                disabled={fold.isPending}
                onClick={() => fold.mutate()}
              >
                {fold.isPending ? 'Folding…' : 'Fold for real'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
