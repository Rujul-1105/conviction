'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Num, Pnl, SolAmount } from '@/components/ui/num'
import { Sparkline } from '@/components/ui/sparkline'

/**
 * FeaturedRoundPreview — replaces the wordmark banner in the hero right
 * column. The single most "wow" surface on the landing.
 *
 * Reads as a live broadcast card: round id, countdown, two villages with
 * avatars + PnL, a basket of 3 token chips, a mini sparkline showing the
 * running P&L over the last 30 ticks, and a "Watch live" CTA. Mono micro-type
 * for every label; conviction-green for the in-the-money village; fold-red
 * for the trailing village; chaos yellow on a token if it's been cursed.
 *
 * All numbers are static but the visual cadence (countdown ring, sparkline
 * shape, the green dot pulse) reads as live.
 *
 * Why this beats the banner: it proves the demo runs. A judge who lands on
 * / sees a screen that looks like an esports broadcast, not a marketing page.
 */
export function FeaturedRoundPreview() {
  // Mock but consistent — same numbers as the marquee + the live round mock.
  const villages = [
    {
      id: 'iron',
      name: 'Village Iron',
      pnl: 4.2,
      tone: 'conviction' as const,
      avatar: 'I',
    },
    {
      id: 'quartz',
      name: 'Village Quartz',
      pnl: -1.8,
      tone: 'fold' as const,
      avatar: 'Q',
    },
  ]
  const basket = [
    { symbol: 'BONK', weight: 0.34, change: 2.4 },
    { symbol: 'JTO', weight: 0.33, change: 5.1 },
    { symbol: 'PYTH', weight: 0.33, change: -1.2, cursed: true },
  ]
  // 30-point walk that ends where the leader stands.
  const series = [
    0.0, 0.4, 0.2, 0.8, 1.1, 0.9, 1.4, 1.6, 2.0, 2.2, 2.4, 2.1, 2.6, 2.9,
    3.0, 2.8, 3.2, 3.4, 3.1, 3.5, 3.7, 3.9, 4.0, 3.8, 4.1, 4.2, 4.0, 4.2,
    4.3, 4.2,
  ]

  return (
    <Link href="/spectate/round-0042" className="block">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="group relative"
      >
        {/* Glow ring behind the card — subtle, only visible on hover, reads as
            conviction-green light. Kept very low so it isn't decorative glow. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-2xl bg-conviction/[0.05] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        />
        <Card className="relative overflow-hidden border-border bg-surface-elevated p-0">
          {/* ── Header strip ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-border bg-surface/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-live-pulse rounded-full bg-fold" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-fold" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fold">
                Live · Round 0042
              </span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              02:18 left
            </span>
          </div>

          {/* ── Villages + basket + sparkline ─────────────────────────────── */}
          <div className="space-y-4 p-5">
            {/* Villages */}
            <div className="grid grid-cols-2 gap-3">
              {villages.map((v) => (
                <div
                  key={v.id}
                  className={
                    'flex items-center gap-2.5 rounded-md border p-2.5 ' +
                    (v.tone === 'conviction'
                      ? 'border-conviction/30 bg-conviction/[0.06]'
                      : 'border-fold/30 bg-fold/[0.06]')
                  }
                >
                  <div
                    className={
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ' +
                      (v.tone === 'conviction'
                        ? 'bg-conviction/15 text-conviction'
                        : 'bg-fold/15 text-fold')
                    }
                  >
                    {v.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-whisper">
                      {v.name}
                    </div>
                    <Pnl value={v.pnl} size="sm" />
                  </div>
                </div>
              ))}
            </div>

            {/* Basket — 3 token chips */}
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
                Basket
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {basket.map((t) => (
                  <div
                    key={t.symbol}
                    className={
                      'flex flex-col rounded-md border px-2 py-1.5 ' +
                      (t.cursed
                        ? 'border-chaos/40 bg-chaos/[0.06]'
                        : 'border-border bg-surface/60')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-paper">
                        {t.symbol}
                      </span>
                      {t.cursed && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-chaos">
                          VRF
                        </span>
                      )}
                    </div>
                    <Num
                      size="sm"
                      tone={t.change > 0 ? 'conviction' : 'fold'}
                      className="mt-0.5"
                    >
                      {t.change > 0 ? '+' : ''}
                      {t.change.toFixed(1)}%
                    </Num>
                  </div>
                ))}
              </div>
            </div>

            {/* Sparkline + meta */}
            <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
                  P&L · 30 ticks
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-heading-md font-bold tabular-nums text-conviction">
                    +4.2%
                  </span>
                  <span className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-conviction">
                    <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                    rising
                  </span>
                </div>
              </div>
              <Sparkline values={series} tone="conviction" width={140} height={36} />
            </div>

            {/* Pot + watch CTA */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-whisper">
                  Pot
                </span>
                <SolAmount value={12} size="md" />
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-conviction">
                Watch live
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                />
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}
