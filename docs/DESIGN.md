# Conviction — Claude Code Context

> Auto-load this file in Claude Code sessions. Read `CLAUDE.md` first for project context, then this file for frontend implementation.
> Updated: 2026-09-07 • Project: MagicBlock Blitz v8 • Stack: Next.js 14 + Anchor + MagicBlock

---

## 1. Brand & Visual Context (DO NOT DRIFT)

The frontend must match the design generated in Google Stitch. These rules are STRICT — do not invent new colors, fonts, or visual patterns.

### Colors (use only these tokens)
```ts
// Full palette in lib/colors.ts
ink: '#0A0A0A'           // background
paper: '#F5F5F0'         // text
surface: '#161616'       // cards
surface-elevated: '#1F1F1F' // modals
border: '#2A2A2A'        // dividers
whisper: '#6B6B6B'       // muted text
text-muted: '#A0A0A0'    // secondary

conviction: '#00FF85'    // ONLY for primary CTA, "in the money", logo, FTR balance
conviction-dim: '#00CC6A' // hover
fold: '#FF3D5A'          // ONLY for stop-loss trigger, fold action, loss state
fold-dim: '#CC2E47'      // hover
hold: '#4A9EFF'          // pending, loading, "still holding"
hold-dim: '#3A7FCC'      // hover
chaos: '#FFD23F'         // chaos warnings (flashes only, never sits)
volatility: '#9D4EDD'    // spectator class ONLY
```

**Hard rules:**
- Default to dark mode. Light mode is accessibility alt, never default.
- Conviction green is restrained. Never for body text. Never decorative.
- Fold red is for folding only. Not for general errors.
- Chaos yellow flashes. Never sits.
- Volatility purple = spectator class. Every spectator element.

### Typography
- Display/headings: **Space Grotesk Bold**
- Body: **Inter Regular/Medium**
- Numbers (timer, prices, P&L, FTR): **JetBrains Mono**, ALWAYS tabular figures, ALWAYS in their own visual lane

### Design rules
- Border radius: 4px (inputs), 6px (buttons/cards), 12px (modals). Never above 12px.
- Borders: 1px solid in `#2A2A2A`. Never thicker.
- No shadows, no gradients, no glassmorphism, no 3D, no glow.
- Data-dense where it matters (live round), minimal where it doesn't (landing).
- Numbers update without transition. Snap, don't fade.
- Respect `prefers-reduced-motion` everywhere.

### Vibe
Linear × Vercel × Phantom × Polymarket × PokerStars. Premium founder-coded, esports-meets-YC. Never meme-casino.

### Wordmark exception
The shipped wordmark `app/logo/banner_with_logo.png` is an intentional brand-mark exception. Display typography throughout the app is Space Grotesk Bold, body is Inter, numbers are JetBrains Mono — but the wordmark, designed and shipped before the type system was locked, is treated as a finished asset and used verbatim at 28px in the nav, at hero scale on `/`, and at 320px on the 404. Do not recreate it in Space Grotesk. The icon mark `app/logo/logo_icon.png` is the same treatment.

---

## 2. File / Folder Structure

```
/conviction/
├── .claude/
│   ├── agents/                    # subagents
│   │   ├── nextjs-frontend.md
│   │   └── mock-builder.md
│   ├── commands/                  # slash commands
│   │   ├── scaffold.md
│   │   ├── screen.md
│   │   └── mock.md
│   └── settings.json
├── app/
│   ├── (auth)/
│   │   └── connect/page.tsx
│   ├── (onboarding)/
│   │   └── welcome/page.tsx
│   ├── (game)/
│   │   ├── lobby/page.tsx
│   │   ├── match/[id]/
│   │   │   ├── setup/page.tsx
│   │   │   └── live/page.tsx
│   │   └── reveal/[id]/page.tsx
│   ├── spectate/
│   │   └── [id]/page.tsx
│   ├── governance/
│   │   └── page.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx                   # landing
│   ├── providers.tsx             # wallet + react-query
│   └── globals.css               # CSS variables from colors.md
├── components/
│   ├── ui/                        # shadcn primitives
│   ├── layout/
│   │   ├── top-nav.tsx
│   │   ├── left-rail.tsx
│   │   └── footer.tsx
│   ├── landing/
│   │   ├── hero.tsx
│   │   ├── live-ticker.tsx
│   │   └── feature-cards.tsx
│   ├── lobby/
│   │   ├── match-card.tsx
│   │   ├── live-now-column.tsx
│   │   └── top-villages.tsx
│   ├── pre-round/
│   │   ├── token-grid.tsx
│   │   ├── basket-tray.tsx
│   │   ├── stop-loss-slider.tsx
│   │   └── team-picker.tsx
│   ├── live-round/
│   │   ├── round-timer.tsx
│   │   ├── price-chart.tsx
│   │   ├── leaderboard-column.tsx
│   │   ├── event-feed.tsx
│   │   ├── action-bar.tsx
│   │   └── stop-loss-status.tsx
│   ├── reveal/
│   │   ├── reveal-sequence.tsx
│   │   └── results-table.tsx
│   ├── spectate/
│   │   └── prediction-panel.tsx
│   └── governance/
│       ├── proposal-card.tsx
│       ├── propose-modal.tsx
│       └── vote-buttons.tsx
├── lib/
│   ├── api/
│   │   ├── index.ts              # api surface + mocks (THE contract)
│   │   ├── mock.ts               # mock data
│   │   └── real.ts               # future: real program calls
│   ├── hooks/
│   │   ├── use-wallet.ts
│   │   ├── use-matches.ts
│   │   ├── use-round.ts
│   │   ├── use-subscribe-round.ts
│   │   ├── use-token-universe.ts
│   │   ├── use-proposals.ts
│   │   └── use-birdeye-prices.ts
│   ├── store/
│   │   ├── wallet-store.ts       # zustand
│   │   ├── match-store.ts
│   │   └── round-store.ts
│   ├── colors.ts
│   ├── motion.ts                 # framer-motion variants
│   ├── birdeye.ts
│   └── utils.ts
├── public/
│   └── tokens/                   # token logos
├── tokens.json                   # hardcoded 25-token universe
├── CLAUDE.md
├── design.md                     # this file
├── colors.md
└── package.json
```

---

## 3. Type System (the contracts)

All types live in `lib/api/index.ts`. The mock layer implements them now; the real layer will call the Anchor program later.

```ts
// === Wallet ===
export type WalletInfo = {
  address: string
  connected: boolean
  ftrBalance: number
  winRate: number
  teamName: string
}

// === Tokens ===
export type TokenTier = 'safe' | 'wild' | 'moonshot'

export type Token = {
  mint: string
  symbol: string
  name: string
  decimals: number
  tier: TokenTier
  currentPrice: number
  priceChange24h: number
  logoUrl?: string
}

// === Game ===
export type StopLoss = {
  tokenMint: string
  thresholdPct: number   // negative: -8 means fold if drops 8%
}

export type Basket = {
  tokens: Token[]
  stopLosses: StopLoss[]
}

export type TeamStatus = 'forming' | 'ready' | 'holding' | 'folded' | 'won'

export type Team = {
  id: string
  name: string
  walletAddresses: string[]
  basket?: Basket
  pnl: number              // percentage
  status: TeamStatus
  foldTime?: number        // unix ms
  worstPerformerMint?: string
}

export type MatchMode = 'classic' | 'reverse' | 'contrarian' | 'coop'
export type MatchStatus = 'forming' | 'live' | 'ended'

export type Match = {
  id: string
  roundNumber: number
  mode: MatchMode
  tier: 'safe' | 'wild' | 'moonshot' | 'mixed'
  pot: number              // SOL
  duration: number         // seconds
  teams: Team[]
  status: MatchStatus
  startTime?: number
  endTime?: number
  villainTokenMint?: string
  chaosEventCount: number
  spectatorCount: number
}

export type RoundEventType =
  | 'round_start' | 'round_end'
  | 'fold' | 'chaos' | 'price'
  | 'win' | 'team_join' | 'lock_in'

export type RoundEvent = {
  id: string
  timestamp: number
  type: RoundEventType
  teamId?: string
  tokenMint?: string
  message: string
  data?: Record<string, unknown>
}

// === Spectator ===
export type SpectatorBetType =
  | 'first_fold' | 'last_holding'
  | 'chaos_count' | 'perfect_round'
  | 'player_specific'

export type SpectatorBet = {
  id: string
  matchId: string
  bettorWallet: string
  type: SpectatorBetType
  prediction: string
  amount: number           // USDC
  status: 'pending' | 'won' | 'lost'
}

// === Governance ===
export type ProposalParameter =
  | 'duration' | 'pot' | 'penalty'
  | 'chaos_count' | 'token_universe' | 'mode'

export type ProposalStatus = 'open' | 'passed' | 'failed' | 'executed'

export type Proposal = {
  id: string
  proposerTeamId: string
  parameter: ProposalParameter
  currentValue: string | number
  proposedValue: string | number
  votesYes: number          // FTR-weighted
  votesNo: number
  status: ProposalStatus
   deadline: number
  isPrivate: boolean
}
```

---

## 4. API Surface (THE contract)

`lib/api/index.ts` exports a single `api` object. Every screen calls `api.X()`. Never call the program directly from a component.

```ts
export const api = {
  // Wallet
  connectWallet: () => Promise<WalletInfo>
  disconnectWallet: () => Promise<void>

  // Matchmaking
  getOpenMatches: () => Promise<Match[]>
  getLiveMatches: () => Promise<Match[]>
  getMatch: (id: string) => Promise<Match>
  createMatch: (params: Partial<Match>) => Promise<Match>
  joinMatch: (id: string) => Promise<void>
  leaveMatch: (id: string) => Promise<void>

  // Pre-round
  setBasket: (matchId: string, basket: Basket) => Promise<void>
  setStopLosses: (matchId: string, stopLosses: StopLoss[]) => Promise<void>
  lockInPicks: (matchId: string) => Promise<void>

  // Live round
  getRound: (matchId: string) => Promise<{ match: Match; events: RoundEvent[] }>
  fold: (matchId: string) => Promise<void>
  getLeaderboard: (matchId: string) => Promise<Team[]>
  subscribeToRound: (matchId: string, cb: (event: RoundEvent) => void) => () => void

  // Spectator
  getSpectatorBets: (matchId: string) => Promise<SpectatorBet[]>
  placeBet: (matchId: string, bet: Omit<SpectatorBet, 'id' | 'bettorWallet' | 'status'>) => Promise<void>

  // Governance
  getFTRBalance: (wallet: string) => Promise<number>
  getProposals: () => Promise<Proposal[]>
  createProposal: (p: Omit<Proposal, 'id' | 'votesYes' | 'votesNo' | 'status'>) => Promise<Proposal>
  vote: (proposalId: string, support: 'yes' | 'no', isPrivate: boolean) => Promise<void>

  // Tokens
  getTokenUniverse: () => Promise<Token[]>
  getVillainToken: (matchId: string) => Promise<Token | null>
}
```

**Implementation rule:** all functions return `Promise.resolve(mockData)` in the mock. The real implementation in `lib/api/real.ts` will call Anchor program instructions. Components don't change.

---

## 5. Mock Data Patterns

The mock data in `lib/api/mock.ts` should tell a story:

- **3 open matches** — one filling fast, one starting soon, one empty (player can create)
- **4 live matches** — at different stages (just started, mid-round, near end, chaos happening)
- **Each team has personality** — names like "Village of Conviction", "Diamond Hand Syndicate", "The Paper Tigers"
- **Leaderboard data should show movement** — one team down 8%, one up 4%, one near zero
- **Events should be time-stamped and dramatic** — "Chaos event: BONK -18% in 90 seconds", "Village of Diamond Hand Syndicate folded"
- **Proposals should be a mix** — one open, one passed, one failed (to show all states)
- **`subscribeToRound`** should fire price updates every 3 seconds (mimics live ER state)

**The mock data is the demo.** Make it cinematic.

---

## 6. Component Patterns

### Status pill (used everywhere for HOLDING/FOLDED/etc.)
```tsx
import { cn } from '@/lib/utils'

type StatusVariant = 'holding' | 'folded' | 'spectating' | 'chaos' | 'pending'

const variantStyles: Record<StatusVariant, string> = {
  holding: 'bg-hold/10 text-hold border-hold/30',
  folded: 'bg-fold/10 text-fold border-fold/30',
  spectating: 'bg-volatility/10 text-volatility border-volatility/30',
  chaos: 'bg-chaos/10 text-chaos border-chaos/30',
  pending: 'bg-surface text-text-muted border-border',
}

export function StatusPill({ variant, children }: { variant: StatusVariant; children: React.ReactNode }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full',
      'font-mono text-[11px] uppercase tracking-wider',
      'border',
      variantStyles[variant]
    )}>
      {children}
    </span>
  )
}
```

### Primary CTA
```tsx
<button className="bg-conviction text-ink font-display font-bold px-6 py-3 rounded-md hover:bg-conviction-dim transition-colors">
  Play with conviction
</button>
```

### Danger button (fold)
```tsx
<button className="border border-fold text-fold font-display font-bold px-6 py-3 rounded-md hover:bg-fold hover:text-paper transition-colors">
  Fold
</button>
```

### Number display (always mono, tabular)
```tsx
<span className="font-mono tabular-nums text-conviction">+4.2%</span>
<span className="font-mono tabular-nums text-fold">-8.1%</span>
<span className="font-mono tabular-nums text-paper">12.4 SOL</span>
```

### Card / panel
```tsx
<div className="bg-surface border border-border rounded-md p-6">
  {/* content */}
</div>
```

---

## 7. Hook Patterns

### `useMatches` — fetch with React Query
```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useOpenMatches() {
  return useQuery({
    queryKey: ['matches', 'open'],
    queryFn: () => api.getOpenMatches(),
    refetchInterval: 5000,
  })
}

export function useLiveMatches() {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: () => api.getLiveMatches(),
    refetchInterval: 3000,
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => api.getMatch(id),
    enabled: !!id,
  })
}
```

### `useSubscribeRound` — real-time updates (mock: interval, real: ER subscription)
```ts
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useSubscribeRound(matchId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsub = api.subscribeToRound(matchId, (event) => {
      // Update the round query cache
      queryClient.setQueryData(['round', matchId], (old: any) => {
        if (!old) return old
        return { ...old, events: [event, ...old.events] }
      })
    })
    return unsub
  }, [matchId, queryClient])
}

export function useRound(matchId: string) {
  const query = useQuery({
    queryKey: ['round', matchId],
    queryFn: () => api.getRound(matchId),
  })
  useSubscribeRound(matchId)
  return query
}
```

### `useBirdeyePrices` — token price feed (real, not mock)
```ts
import { useQuery } from '@tanstack/react-query'
import { fetchBirdeyePrices } from '@/lib/birdeye'

export function useBirdeyePrices(mints: string[]) {
  return useQuery({
    queryKey: ['prices', mints.sort().join(',')],
    queryFn: () => fetchBirdeyePrices(mints),
    refetchInterval: 5000,
    enabled: mints.length > 0,
  })
}
```

### `useCountdown` — round timer
```ts
import { useEffect, useState } from 'react'

export function useCountdown(endTime: number) {
  const [remaining, setRemaining] = useState(endTime - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, endTime - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return { minutes, seconds, expired: remaining <= 0 }
}
```

---

## 8. State Management (Zustand)

Only use Zustand for **client-only state that doesn't go onchain**. Everything else uses React Query.

```ts
// lib/store/wallet-store.ts
import { create } from 'zustand'
import { api } from '@/lib/api'
import type { WalletInfo } from '@/lib/api'

interface WalletState {
  wallet: WalletInfo | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  isConnecting: false,
  connect: async () => {
    set({ isConnecting: true })
    const wallet = await api.connectWallet()
    set({ wallet, isConnecting: false })
  },
  disconnect: async () => {
    await api.disconnectWallet()
    set({ wallet: null })
  },
}))

// lib/store/round-store.ts — local UI state during a round
import { create } from 'zustand'

interface RoundUIState {
  selectedBasketTokens: string[]
  stopLosses: Record<string, number>
  step: 'basket' | 'stoploss' | 'team' | 'locked'
  setStep: (step: RoundUIState['step']) => void
  toggleToken: (mint: string) => void
  setStopLoss: (mint: string, pct: number) => void
  reset: () => void
}

export const useRoundUIStore = create<RoundUIState>((set) => ({
  selectedBasketTokens: [],
  stopLosses: {},
  step: 'basket',
  setStep: (step) => set({ step }),
  toggleToken: (mint) => set((s) => ({
    selectedBasketTokens: s.selectedBasketTokens.includes(mint)
      ? s.selectedBasketTokens.filter(m => m !== mint)
      : [...s.selectedBasketTokens, mint].slice(0, 3) // max 3
  })),
  setStopLoss: (mint, pct) => set((s) => ({
    stopLosses: { ...s.stopLosses, [mint]: pct }
  })),
  reset: () => set({ selectedBasketTokens: [], stopLosses: {}, step: 'basket' }),
}))
```

---

## 9. Motion Variants (Framer Motion)

In `lib/motion.ts`:

```ts
import { Variants } from 'framer-motion'

export const convictionFlash: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(0, 255, 133, 0)' },
  flash: {
    boxShadow: [
      '0 0 0 0 rgba(0, 255, 133, 0.6)',
      '0 0 0 16px rgba(0, 255, 133, 0)',
    ],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export const foldFlash: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(255, 61, 90, 0)' },
  flash: {
    boxShadow: [
      '0 0 0 0 rgba(255, 61, 90, 0.6)',
      '0 0 0 16px rgba(255, 61, 90, 0)',
    ],
    transition: { duration: 1.0, ease: 'easeOut' },
  },
}

export const chaosPulse: Variants = {
  initial: { opacity: 1 },
  pulse: {
    opacity: [1, 0.4, 1],
    transition: { duration: 0.6, repeat: 3, ease: 'easeInOut' },
  },
}

export const revealSequence: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: 'easeOut' },
  }),
}
```

Use with `<motion.div variants={...} initial="initial" animate="flash">`. Always wrap in a `useReducedMotion` check.

---

## 10. Screen Implementation Specs

Each screen = 1 page + 1-3 components. Use these as the build order.

### Priority 1: Landing (`app/page.tsx`)
- Hero section with "Conviction or the fold." + "Play with conviction" CTA
- Live ticker strip (pulls from `useLiveMatches`)
- 3 feature cards (static, copy from design.md)
- Top nav (logo + Connect Wallet)
- Footer

### Priority 2: Connect (`app/(auth)/connect/page.tsx`)
- Wallet adapter modal (Phantom, Solflare, Backpack)
- "Switch to devnet" warning if on mainnet
- Calls `useWalletStore.connect()`

### Priority 3: Lobby (`app/(game)/lobby/page.tsx`)
- Top nav (sticky, with FTR balance from wallet)
- Left rail (vertical icon nav)
- Open matches list (`useOpenMatches`)
- Live now column (`useLiveMatches`)
- "Create match" button → opens modal
- Top villages leaderboard (static for now)

### Priority 4: Pre-round setup (`app/(game)/match/[id]/setup/page.tsx`)
- 3-step stepper (Basket → Stop-losses → Team)
- Step 1: token grid (filtered by tier), basket tray shows selections
- Step 2: stop-loss slider per selected token
- Step 3: team picker (mock teammates), chat
- "Lock in" button → routes to live page
- Uses `useRoundUIStore` for local state

### Priority 5: Live round (`app/(game)/match/[id]/live/page.tsx`) — THE HEART
- Top strip: timer (`useCountdown`), round label, team pills
- Center: live price chart (mocked for now, real Birdeye later)
- Left: leaderboard column (`useLeaderboard`)
- Right: event feed (from `useRound`)
- Bottom: action bar (Hold / Fold / Message buttons)
- All real-time updates via `useSubscribeRound`
- This screen needs the most polish — it's the demo centerpiece

### Priority 6: Reveal (`app/(game)/reveal/[id]/page.tsx`)
- Reveal sequence (use `revealSequence` variants)
- Results table (team, fold time, worst-performer, P&L, rank)
- Pot distribution breakdown
- "Propose rule change" button if user won
- "Join next match" CTA

### Priority 7: Spectator (`app/spectate/[id]/page.tsx`)
- Same layout as live round but:
  - All action buttons removed
  - Replace with `PredictionPanel` (sealed bid form)
  - Status pill: SPECTATING (volatility purple)
  - Background gets 5% volatility purple tint
- Uses `useSpectatorBets` + `api.placeBet`

### Priority 8: Governance (`app/governance/page.tsx`)
- FTR balance in massive conviction green mono
- Active proposals list (`useProposals`)
- Each proposal card: title, param change, vote tally, vote buttons
- "Propose change" button → modal
- Uses `api.createProposal`, `api.vote`

### Priority 9: Onboarding (`app/(onboarding)/welcome/page.tsx`)
- 3-slide carousel (skip button top-right)
- Slide content from design.md
- Dots indicator
- "Let's play" CTA on slide 3

---

## 11. Birdeye Integration (real prices for the demo)

`lib/birdeye.ts`:

```ts
const BIRDEYE_API = 'https://public-api.birdeye.so'

export async function fetchBirdeyePrices(mints: string[]): Promise<Record<string, number>> {
  const response = await fetch(
    `${BIRDEYE_API}/defi/multi_price?list_address=${mints.join(',')}`,
    { headers: { 'x-chain': 'solana' } }
  )
  if (!response.ok) throw new Error('Birdeye fetch failed')
  const data = await response.json()
  return data.data || {}
}
```

For the live round view, **use mock prices for the demo** (more dramatic, more controllable). Real Birdeye is for the deployed version.

---

## 12. Workflow Conventions

### Component file pattern
- One component per file, named to match the export
- `'use client'` directive at the top of any file with state, effects, or browser APIs
- Server components by default — only opt into client when needed
- Co-locate sub-components in the same file if they're only used together

### Import pattern
```ts
// External
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Internal alias
import { api } from '@/lib/api'
import { useOpenMatches } from '@/lib/hooks/use-matches'
import { StatusPill } from '@/components/ui/status-pill'
import { convictionFlash } from '@/lib/motion'
```

### Naming
- Pages: `page.tsx`
- Components: `kebab-case.tsx` (e.g., `match-card.tsx`)
- Hooks: `use-kebab.ts` (e.g., `use-open-matches.ts`)
- Stores: `kebab-store.ts` (e.g., `wallet-store.ts`)
- Types: in `lib/api/index.ts`, not separate files

### Don'ts
- ❌ No hardcoded hex colors. Always use Tailwind tokens (`text-conviction`, not `text-[#00FF85]`)
- ❌ No inline styles for colors. Use Tailwind classes.
- ❌ No `any` types. Use the defined types from `lib/api`.
- ❌ No direct Solana program calls in components. Go through `api`.
- ❌ No fake data inline. Mock layer is the only source.
- ❌ No shadows, gradients, or glows. Use borders and surface contrast.
- ❌ No transitions on numbers. Snap updates only.
- ❌ No emoji. Never. (Use icon components.)

---

## 13. Build Order (4 days, frontend-only)

| Day | Focus | Output |
|---|---|---|
| **Day 1** | Foundation | Next.js scaffolded, colors/motion/colors set up, mock API complete, wallet adapter wired, shadcn primitives installed |
| **Day 2** | Static screens | Landing, Connect, Lobby, Onboarding, Governance (all functional with mocks) |
| **Day 3** | Live experience | Pre-round setup, Live round view (THE heart), Reveal, Spectator — all with mock real-time updates |
| **Day 4** | Polish + ship | Animations, wallet integration, Birdeye for deployed version, deploy to Vercel, demo video, README, submit |

---

## 14. Don't Do (for Claude Code)

- ❌ Don't add new colors. If a screen needs a color not in the palette, ask.
- ❌ Don't add new dependencies without checking. Default to: React, Next.js, Tailwind, shadcn, framer-motion, @tanstack/react-query, @solana/wallet-adapter-react, zustand.
- ❌ Don't refactor the mock layer. It's intentional. The interface is the contract.
- ❌ Don't over-engineer. Skip: routing guards, error boundaries beyond basics, loading skeletons beyond simple spinners, accessibility beyond color contrast + reduced-motion.
- ❌ Don't write tests. Hackathon. Ship.
- ❌ Don't add features not in design.md. The spec is the spec.
- ❌ Don't create new file structures. Follow section 2 exactly.

---

## 15. Program Interface (TODO — fill in from your Anchor program)

When wiring backend, the `api` object will be reimplemented in `lib/api/real.ts`. To do that, I need the actual program interface. **When ready, send me these from your Anchor program:**

1. **Instructions** — every function name + its `Context` + args
2. **Account structs** — every `#[account]` definition with its fields
3. **Events** — every `emit!` event
4. **Error codes** — every `#[error_code]`

Then I'll generate `lib/api/real.ts` that maps each `api.X()` call to the right program instruction. Screen code doesn't change at all.

---

*End of context. This file is auto-loaded alongside CLAUDE.md. Read it first, then build.*
