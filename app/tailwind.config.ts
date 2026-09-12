import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

/**
 * Tailwind theme for Conviction.
 *
 * Every value here comes from docs/DESIGN.md §1, which is the authoritative
 * source for color, radius and typography. docs/PHASE_B_BRIEF.md and
 * docs/design-tokens.json describe a *different* palette (#0A0E13 base, Geist,
 * 6/12/24 radii); DESIGN.md wins per the Phase B decision recorded in ADR 0003.
 *
 * DESIGN.md §14 forbids hardcoded hex in components — that rule only works if
 * every colour the UI needs is named here. If a screen wants a colour that
 * isn't in this file, that's a design question, not a Tailwind question.
 *
 * Phase 8 — Frontend visual redesign (ADR 0005) additions:
 *  - fontSize display-2xl (96px) + display-3xl (128px) + display-4xl (160px)
 *  - surface.overlay (one shade above ink, for dialog backdrops)
 *  - marquee-ticker, countdown-tick, nrft-rise keyframes + animation entries
 *  - tailwindcss-animate plugin (required by shadcn primitives)
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces and text — dark is the default, not a variant.
        ink: '#0A0A0A',
        paper: '#F5F5F0',
        surface: {
          DEFAULT: '#161616',
          elevated: '#1F1F1F',
          overlay: '#0F0F0F',
        },
        border: '#2A2A2A',
        whisper: '#6B6B6B',
        'text-muted': '#A0A0A0',

        // Semantic accents. Each one has exactly one meaning — see DESIGN.md §1.
        conviction: { DEFAULT: '#00FF85', dim: '#00CC6A' }, // primary CTA / in the money / FTR
        fold: { DEFAULT: '#FF3D5A', dim: '#CC2E47' }, // folding and stop-loss only, NOT generic errors
        hold: { DEFAULT: '#4A9EFF', dim: '#3A7FCC' }, // pending / loading / still holding
        chaos: '#FFD23F', // flashes only, never sits
        volatility: '#9D4EDD', // spectator class only
      },

      // Capped at 12px. DESIGN.md: "Never above 12px."
      borderRadius: {
        sm: '4px', // inputs
        md: '6px', // buttons, cards
        lg: '12px', // modals
      },

      fontFamily: {
        // Wired to next/font CSS variables in app/layout.tsx.
        // Display = Oxanium (techno-grotesque, esports-broadcast character).
        // Dirt = Rubik Dirt (graffiti woodtype) — accent on FOLD + the motto.
        // Body = Inter. Mono = JetBrains Mono with tabular figures.
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        dirt: ['var(--font-dirt)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Editorial scale jumps — agency-grade display earns 96-160px when the
        // surface is the landing marquee. Oxanium's sharp terminals read
        // confidently at every step. Mobile caps at display-xl (64px).
        'display-4xl': ['160px', { lineHeight: '152px', letterSpacing: '-0.04em' }],
        'display-3xl': ['128px', { lineHeight: '124px', letterSpacing: '-0.035em' }],
        'display-2xl': ['96px', { lineHeight: '96px', letterSpacing: '-0.03em' }],
        'display-xl': ['64px', { lineHeight: '68px', letterSpacing: '-0.02em' }],
        'display-lg': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em' }],
        'heading-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em' }],
        'heading-md': ['24px', { lineHeight: '32px' }],
        'heading-sm': ['18px', { lineHeight: '24px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '22px' }],
        'body-sm': ['12px', { lineHeight: '18px' }],
        // Uppercase micro-label used for table headers and status text.
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
      },

      maxWidth: { content: '1200px' },

      keyframes: {
        // Live indicator breathing pulse (1.5s per PHASE_B_BRIEF).
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        // Single 120ms background flash when a number ticks. Note this flashes
        // the *container*, never the digits — numbers themselves must snap.
        'tick-flash': {
          '0%': { backgroundColor: 'rgb(31 31 31)' },
          '100%': { backgroundColor: 'transparent' },
        },
        // Live ticker marquee. Two copies of children translate by 50% so the
        // loop is seamless. Paused on group-hover via Tailwind variant.
        'marquee-ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Timer tick — semantically distinct from tick-flash so callers can
        // hook a different listener if they ever need to.
        'countdown-tick': {
          '0%': { backgroundColor: 'rgb(31 31 31)' },
          '100%': { backgroundColor: 'transparent' },
        },
        // FTR counter reveal — gentle rise + fade. For reveal-sequence winners.
        'nrft-rise': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
        'tick-flash': 'tick-flash 120ms ease-out',
        'marquee-ticker': 'marquee-ticker 50s linear infinite',
        'countdown-tick': 'countdown-tick 120ms ease-out',
        'nrft-rise': 'nrft-rise 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionTimingFunction: {
        // Entrance easing shared by menus and the reveal cascade.
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
