# Phase B1 Design Brief — Stonk Battles (Path A)

> For use by the Phase B1 session (frontend scaffold + four pages). Read this
> file before any UI work. The Tailwind tokens are in `docs/design-tokens.json`
> (next to this file).

## Tone & feel

**One-line:** *Bloomberg terminal at 11 PM after a few drinks — dense, alive,
warm under the surface.*

The game shifts register during a round:

1. **Pre-round (lobby, /pre-round):** stock-app calm. Cool grays, monospace
   tickers, generous whitespace, micro-flash on price updates. Reads like a
   trading desk at market open.
2. **Live (mission control):** terminal density. Compact panels, live event
   feed, side-by-side team leaderboard, hero timer, status banners. Reads like
   a war-room.
3. **Reveal:** cinematic cascade. Cards flip, FTR counter increments, villain
   label reveals. Calm returns in the lobby.

Anti-patterns to **avoid**:

- Generic SaaS gradients, purple-pink, "AI startup" cards.
- Pure white backgrounds. Pure white text on dark.
- Wall Street grey monochrome. We're not Bloomberg-daylight.
- Crypto-WAGMI vibes. No rainbow gradients, no degen emojis.
- Tailwind preset colors as-is. Override the palette.

## Color palette

See `docs/design-tokens.json` for exact values + Tailwind theme extension.

**Surfaces (cool-warm near-black, never pure #000):**

| Token            | Value     | Use |
| ---------------- | --------- | --- |
| `bg.base`        | `#0A0E13` | Page background. |
| `bg.surface`     | `#10151C` | Cards, panels, dialogs. |
| `bg.surface-alt` | `#161D27` | Nested surface (e.g. leaderboard row on a card). |
| `bg.elevated`    | `#1C2530` | Hover / selected / focused surface. |
| `border.default` | `#222D3D` | Default 1px border. |
| `border.strong`  | `#3A4A60` | Focused / hover border. |

**Text:**

| Token         | Value     | Use |
| ------------- | --------- | --- |
| `text.primary`   | `#E5E7EB` | Body text. Off-white, not pure. |
| `text.secondary` | `#94A3B8` | Labels, captions, meta. |
| `text.muted`     | `#475569` | Disabled, watermark, axis ticks. |
| `text.inverse`   | `#0A0E13` | Text on light / accent surfaces. |

**Semantic accents (each has `bg.<name>`, `text.<name>`, `border.<name>` variants):**

| Token      | Value     | Meaning |
| ---------- | --------- | ------- |
| `accent.up`      | `#22C55E` | Team A, price up, profit, victory. *Mint green, slightly warm.* |
| `accent.down`    | `#F97316` | Team B, price down, loss, fold. *Warm orange — NOT red; red is reserved for danger.* |
| `accent.villain` | `#EF4444` | Villain token, hard cap, panic. *Use sparingly; saturates fast.* |
| `accent.ftr`     | `#FCD34D` | FTR token, gold, leaderboard crown. *Warm gold, never yellow.* |
| `accent.chaos`   | `#A78BFA` | Chaos event banner, fake-news highlight. *Violet, slightly cool.* |
| `accent.live`    | `#22D3EE` | Live indicator dot, ER-pulse, "on-chain" status. *Cyan, the only cool hue.* |
| `accent.warning` | `#F59E0B` | Stop-loss hit, auto-fold. *Amber, between FTR and down-orange.* |

**Phase-specific surfaces** (used in `mission-control` panels for Live round):

| Token                | Value      | Use |
| -------------------- | ---------- | --- |
| `bg.match.team-a`    | `rgba(34,197,94,0.08)` | Subtle Team A panel tint. |
| `bg.match.team-b`    | `rgba(249,115,22,0.08)` | Subtle Team B panel tint. |
| `bg.match.villain`   | `rgba(239,68,68,0.10)` | Villain-event backdrop. |
| `bg.match.chaos`     | `rgba(167,139,250,0.10)` | Chaos-event backdrop. |
| `border.event`      | `#3A4A60` | Event-feed row separator. |

## Typography

| Role               | Font                              | Size / line-height |
| ------------------ | --------------------------------- | ------------------ |
| `display.xl`       | Geist / Inter Display, weight 600 | 64 / 72 |
| `display.lg`       | Geist, weight 600                 | 48 / 56 |
| `heading.lg`       | Geist, weight 600                 | 32 / 40 |
| `heading.md`       | Geist, weight 600                 | 24 / 32 |
| `heading.sm`       | Geist, weight 500                 | 18 / 24 |
| `body.lg`          | Geist, weight 400                 | 16 / 24 |
| `body.md`          | Geist, weight 400                 | 14 / 22 |
| `body.sm`          | Geist, weight 400                 | 12 / 18 |
| `mono.lg`          | JetBrains Mono, weight 500       | 16 / 24 — prices, counts |
| `mono.md`          | JetBrains Mono, weight 500       | 14 / 22 |
| `mono.sm`          | JetBrains Mono, weight 500       | 12 / 18 |
| `caps.label`       | Geist, weight 600, tracking 0.08em, uppercase | 11 / 16 — section labels |

**Rules:**

- Numbers (prices, counts, FTR balance) **always** in `mono.*` so digits don't
  jump. Use `font-variant-numeric: tabular-nums`.
- Card titles in `heading.sm`. Page titles in `heading.lg` or `display.xl`.
- Section labels in `caps.label` for visual scan-ability.
- Italics never. Bold sparingly.

## Layout

- 12-column grid, 16px outer padding, max content width 1200px on desktop,
  full-bleed on mobile.
- Cards: 16–24px internal padding, 1px `border.default` border, no shadow
  on dark surfaces (shadows look wrong on near-black). Use surface tint +
  border to separate layers.
- Radii: `rounded-sm` 6px for tags, `rounded-md` 12px for cards, `rounded-lg`
  24px for hero panels. Avoid `rounded-full` except for status dots.
- Spacing: 4px grid. Default gap 16px. Section gap 32px.

## Motion

Framer Motion is in the lock-stack. Rules:

- **Tick flash**: price tick on `Live` page → `bg.elevated` 120ms flash.
- **Reveal cascade**: cards flip 600ms with `staggerChildren: 80ms`.
- **Live indicator pulse**: 1.5s `scale 1 → 1.05 → 1` infinite, `accent.live` color.
- **No bouncy springs** outside the reveal. Side-menu transitions are 180ms ease-out.
- **`prefers-reduced-motion`** disables the live pulse and reveal cascade.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances (per emil-design-eng).

## Component inventory (Phase B1)

Reference for shadcn primitives and custom components. All below the `<app/>/`
tree.

| Component                       | Purpose |
| ------------------------------- | ------- |
| `<WalletButton>`                | Phantom / Solflare adapter modal. Wraps shadcn `Button`. Replaces the spike's flaky `WalletMultiButton`. |
| `<PriceTicker mint=… live=…>`    | Monospace price with sub-120ms tick flash. Subscribes to the basket's mint price via `connection.onAccountChange` on the ER. |
| `<Leaderboard teams=[...]>`      | Side-by-side team panels with score, alive, members. Background tints per team. |
| `<EventFeed events=[...]>`       | Vertical feed of recent events (commit, chaos, stop-loss hit). Max-height, scrolls. |
| `<HoldFold />`                  | "Hold" / "Fold" buttons during Live. Disabled after first press. Disabled on spectators. |
| `<ChaosBanner kind=…>`          | Full-width banner that drops in for chaos events. Color-tinted by kind (Rug/Pump/FakeNews). |
| `<RevealSequence cards=[...]>`  | Card-flip cascade on Reveal page. |
| `<FtrBadge balance=…>`          | FTR token balance with a small gold crown icon. Monospace digits. |
| `<PhasePill phase=…>`           | Small pill showing match phase (Created / LockedIn / Live / Revealed / Finalized). Color-tinted. |
| `<VillainBadge mint=…>`         | Compact villain-token pill with the red flag emoji / icon. |

shadcn primitives to install:

- `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`,
  `popover`, `separator`, `skeleton`, `tabs`, `toast`, `tooltip`.

## Pages (per `docs/PLAN.md`)

1. **`/` (landing)**
   - Three large CTAs: **Play / Spectate / Learn**.
   - Live ticker: 3–5 most-recently-created matches, scrolling, monospace.
   - Footer: program ID, ER endpoint, doc links.
2. **`/lobby`**
   - **Open matches** list + **Live now** rail (top-right).
   - "Create match" CTA → modal with `match_id` + `pot` inputs.
   - Top-right: `<FtrBadge>` + `<WalletButton>` + auto-generated team name.
3. **`/match/[id]/pre-round`**
   - 3-step horizontal flow: pick basket → set stop-loss range → find/confirm team → **Lock In**.
   - PER member list chips; visible "this commitment is sealed until reveal" notice.
   - Hidden villain token until callback fires (just "?" placeholder).
4. **`/match/[id]/live` (mission control)**
   - Hero timer at top, large mono digits.
   - Two-column team panels (left/right). Live scores + per-player status.
   - Bottom rail: `<HoldFold>` (left) + `<EventFeed>` (center) + `<ChaosBanner>` (right, conditional).
   - When stop-loss hits: red banner + auto-fold animation.
   - Subscribe to ER `Match` / `Team` / `VillainPick` / `ChaosEvent` via
     `connection.onAccountChange` on the router-resolved fqdn.
5. **`/match/[id]/reveal`**
   - `<RevealSequence>` card cascade.
   - Results table: team scores, per-player FTR payouts, villain performance, chaos summary.
   - "Back to lobby" CTA.
6. **`/spectate/[id]`** (read-only variant of `/live`).

## State management

- **Server state** (match, team, basket, villain, chaos): TanStack Query
  via `connection.getAccountInfo` + `connection.onAccountChange` subscriptions.
- **Client state** (selected mint, slider value, lock-in progress): Zustand.
- **Toast notifications**: Sonner (matches Phase 0 spike's setup).

## Auth

- Wallet adapter (`@solana/wallet-adapter-react`) auto-detects Phantom /
  Solflare. No email auth, no OAuth. RLS in Supabase (Phase C) ties user IDs
  to wallet pubkey when needed.

## Phase B1 task sequence (recommended)

1. Restore `programs/conviction/` to standard `programs/<name>/` workspace
   layout — Anchor CLI + `anchor deploy` then writes the IDL account on chain.
2. `anchor idl fetch Fh6bQUgE35Hq7nP22GZ1Youwnph2UaiEh9xTtDJuHJbH -o app/lib/idl.json`
3. `pnpm create next-app app` with TypeScript + Tailwind + App Router.
4. `pnpm add @coral-xyz/anchor @magicblock-labs/ephemeral-rollups-sdk @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js zustand @tanstack/react-query sonner framer-motion clsx tailwind-merge class-variance-authority`.
5. `pnpm dlx shadcn@latest init` + add primitives listed above.
6. Extend Tailwind theme with `docs/design-tokens.json` (path alias to keep
   it out of the bundle if needed).
7. Build `app/lib/magicblock.ts` (dual connection, router resolution,
   subscription helper) — copy from `spike/app/lib/magicblock.ts` and refresh.
8. Build `app/lib/permissioned.ts` (PER wrapper) — copy from spike.
9. Build `app/lib/idl.ts` (lazy loader) — copy from spike + update program ID.
10. Build pages in order: `/` → `/lobby` → `/match/[id]/pre-round` →
    `/match/[id]/live` → `/match/[id]/reveal` → `/spectate/[id]`.
11. Deploy to Vercel.

## Phase B1 anti-goals (defer)

- Real-time chat inside Live page (defer to Phase C or omit).
- Mobile-app-native styling (responsive is enough).
- Profile pages, leaderboards across matches, history.
- Real Birdeye prices for the curated universe (Phase B MVP uses anchor-spl
  price extrapolation; Phase B+ can integrate Birdeye).
