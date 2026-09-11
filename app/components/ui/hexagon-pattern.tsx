'use client'

import { cn } from '@/lib/utils'

/**
 * HexagonPattern — SVG-based hexagonal grid background (DESIGN.md §1 polish).
 *
 * Inspired by Magic UI's `hexagon-pattern` (magicui.design). Subtle by design:
 * low-opacity strokes on a transparent fill, sized to read as ambient texture
 * rather than foreground decoration. The hex tiles are static — the wrapper
 * carries an optional slow scroll on the y-axis so the pattern "breathes"
 * without ever distracting from the content above it.
 *
 * Usage:
 *   <div className="relative">
 *     <HexagonPattern className="absolute inset-0 -z-10 opacity-40" />
 *     <Content />
 *   </div>
 *
 * No shadows, no gradients — flat strokes on a single hex tile, replicated via
 * the SVG `pattern` element. Honours `prefers-reduced-motion` by killing the
 * scroll animation at the CSS layer.
 */
export function HexagonPattern({
  className,
  size = 60,
  strokeColor = 'rgba(255, 255, 255, 0.06)',
  fillColor = 'transparent',
  animated = true,
  /** When true, applies a slow upward translateY so the grid breathes. */
  scroll = false,
}: {
  className?: string
  /** Width/height of one hexagon tile (px). Smaller = denser. */
  size?: number
  /** Stroke colour for the hex outline. CSS-var or hex. */
  strokeColor?: string
  /** Fill colour for the hex interior. CSS-var or hex. */
  fillColor?: string
  /** Subtle pulse on stroke opacity — the "breathing" rhythm. */
  animated?: boolean
  /** Slow upward scroll — turn this on for ambient motion behind hero content. */
  scroll?: boolean
}) {
  // Hex tile geometry: a flat-top hexagon that tiles in a brick pattern.
  // Width = 2 × size; Height = √3 × size (≈ 1.732 × size). Two rows offset by
  // half-width give a seamless repeat.
  const w = size * 2
  const h = Math.round(size * Math.sqrt(3))
  const half = size / 2
  const quarter = h / 4

  // The single hex shape, drawn once and referenced by the pattern element.
  const hexPath =
    `M ${size} 0 ` + // top vertex
    `L ${size + quarter} ${half} ` + // upper-right
    `L ${size + quarter} ${size + half} ` + // lower-right
    `L ${size} ${size * 2} ` + // bottom vertex
    `L ${quarter} ${size + half} ` + // lower-left
    `L ${quarter} ${half} Z` // upper-left, close

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        scroll && 'hexagon-pattern-scroll',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        className={cn(animated && 'animate-[hexagon-pulse_8s_ease-in-out_infinite]')}
      >
        <defs>
          <pattern
            id="hexagon-grid"
            width={w}
            height={h * 2}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0,0)`}
          >
            {/* Two hex tiles per repeat unit — second one offset by half-width
                so adjacent rows interlock like a brick. */}
            <path d={hexPath} fill={fillColor} stroke={strokeColor} strokeWidth="1" />
            <path
              d={hexPath}
              transform={`translate(${w / 2}, ${h})`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        {/* The fill rect inherits the pattern; size is generous so it overflows
            the parent during scroll animation without ever showing edges. */}
        <rect width="100%" height="100%" fill="url(#hexagon-grid)" />
      </svg>

      {/* Local keyframes for the breathing pulse + slow scroll. Reduced-motion
          users get nothing — the @media block in globals.css already kills CSS
          animations globally, so these keys only render motion for users who
          opt in. */}
      <style jsx>{`
        @keyframes hexagon-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        @keyframes hexagon-scroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-${h * 2}px);
          }
        }
        :global(.hexagon-pattern-scroll) {
          animation: hexagon-scroll 18s linear infinite;
        }
      `}</style>
    </div>
  )
}
