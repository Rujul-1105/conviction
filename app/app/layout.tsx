import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Oxanium, Rubik_Dirt } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

/**
 * Root layout.
 *
 * Fonts are loaded via next/font and exposed as CSS variables that
 * tailwind.config.ts reads (font-display / font-sans / font-mono / font-dirt).
 * Per DESIGN.md §1 + Phase 8 polish the system has four faces:
 *  - Oxanium (techno-grotesque) — primary display at 96–128px
 *  - Rubik Dirt (graffiti/woodtype) — accent on FOLD + the motto
 *  - Inter — body
 *  - JetBrains Mono — numbers, addresses, timestamps
 */

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const rubikDirt = Rubik_Dirt({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dirt',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Conviction — Stonk Battles',
  description:
    'Team vs team chicken on Solana. Pick a basket, set your stop-loss, and hold longer than the other village. Conviction or the fold.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: the wallet adapter reads window on mount, so
    // the first client paint can legitimately differ from the server's.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${oxanium.variable} ${rubikDirt.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
