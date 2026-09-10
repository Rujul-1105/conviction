import type { Config } from 'tailwindcss'

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
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Type scale from PHASE_B_BRIEF (it doesn't contradict DESIGN.md here).
        'display-xl': ['64px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
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
      },
      animation: {
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
        'tick-flash': 'tick-flash 120ms ease-out',
      },

      transitionTimingFunction: {
        // Entrance easing shared by menus and the reveal cascade.
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
