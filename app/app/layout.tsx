import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

/**
 * Root layout.
 *
 * Fonts are loaded via next/font and exposed as CSS variables that
 * tailwind.config.ts reads (font-display / font-sans / font-mono). Per
 * DESIGN.md §1 there are exactly three: Space Grotesk for display, Inter for
 * body, JetBrains Mono for every number.
 */

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
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
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
