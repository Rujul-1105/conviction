import { cn } from '@/lib/utils'

/**
 * Tiny inline-SVG trend line. 60×20 default — fits a single leaderboard row
 * or a basket-token price cell without breaking layout. The caller passes a
 * numeric series; the line colour maps to a semantic palette token.
 *
 * Renders nothing for empty / single-point series. No axis, no labels — this
 * is a glyph, not a chart.
 */
export function Sparkline({
  values,
  tone = 'conviction',
  width = 60,
  height = 20,
  className,
}: {
  values: number[]
  tone?: 'conviction' | 'fold' | 'hold'
  width?: number
  height?: number
  className?: string
}) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const stroke =
    tone === 'fold'
      ? 'var(--fold)'
      : tone === 'hold'
        ? 'var(--hold)'
        : 'var(--conviction)'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
