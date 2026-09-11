'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Final "next match" CTA — the cinematic punctuation on the reveal cascade.
 *
 * DESIGN.md §10 priority 6 calls the reveal "the theatrical payoff". The
 * payoff needs an exit; this card is that. HOLD . RESIST . SURVIVE. — the
 * three verbs that frame the whole product — are surfaced one last time
 * before the user returns to the lobby for the next round.
 */
export function NextMatchCta() {
  return (
    <Card className="text-center">
      <h2 className="font-display text-heading-md text-paper">
        Hold. Resist. Survive.
      </h2>
      <p className="mt-2 text-body-md text-whisper">
        HOLD . RESIST . SURVIVE. — your next round is one click away.
      </p>
      <div className="mt-4">
        <Link href="/lobby">
          <Button variant="primary" size="lg">
            Return to lobby
          </Button>
        </Link>
      </div>
    </Card>
  )
}
