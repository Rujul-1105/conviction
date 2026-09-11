# ADR 0005 — Phase 8 frontend visual redesign

**Status.** Accepted 2026-09-11 (Blitz v8 build window, day 5 of 5).
**Complements.** [ADR 0003](0003-phase-b-frontend.md) (DESIGN.md authoritative,
mock-first data layer, React 18 pin). Does **not** supersede DESIGN.md — it
extends §1 (typography scale) and §3 (components) within the same design
language.
**Reversibility.** The redesign is additive on top of Phase 7. Reverting to
the Phase 7 surface is a `git revert` of the Phase 8 commits; no data-model
or API contract changes.

## Context

Phase 7 shipped a functional demo at `708f298` + 4 source-only follow-ons:
mock-data fallback, deploy artifacts, on-chain bootstrap, Birdeye live.
The demo is end-to-end runnable but the visual identity did not yet land
as tournament-grade. The Phase B ship-list (DESIGN.md §2 ten routes) is
all there, but the surface feels thin: typeface scale tops out at 64px,
the brand wordmark is in three places, the motto "HOLD . RESIST . SURVIVE."
appears nowhere, and shared chrome (TopNav, LeftRail, Footer) was built
generic to ship the routes — not opinionated for the tournament framing.

We have 1 day left in the build window. Highest-leverage work is visual
hardening on the signature surfaces (Landing, Live Mission Control,
Reveal) plus global chrome — copy, type, motto placement, shadcn layer
trim. No palette change (DESIGN.md §1 wins). No data-layer or on-chain
changes — this is a polish pass, not a refactor.

## Decision

### 1. Scope: three signature screens + global chrome

The redesign hardens three signature surfaces:

1. **Landing (`/`)** — hero marquee, manifesto, ticker strip.
2. **Live round Mission Control (`/match/[id]/live`)** — round timer,
   basket prices, leaderboard, event feed, hold/fold, chaos banner.
3. **Reveal sequence (`/reveal/[id]`)** — basket flip, stop-loss
   reveal, results, FTR earned, Whale Watcher badge.

Plus global chrome: `TopNav`, `LeftRail`, `Footer`, `CommandPalette`.

### 2. Wordmark

The shipped custom stencil-cut face stays as the brand mark. It is an
intentional brand-mark exception — DESIGN.md §1 acknowledges it. The
wordmark renders in exactly 3 places: TopNav left, Footer center-left,
the Landing hero "stacked" variant.

### 3. Motto: "HOLD . RESIST . SURVIVE."

Integrated at exactly **8 touchpoints** (counted):

1. TopNav center — small caps, tracking-widest, next to logo.
2. Footer left — micro-line under the wordmark.
3. Landing hero — sub-headline under the marquee.
4. Landing manifesto section — pull-quote treatment.
5. Live round top bar — between timer and round-phase pill.
6. Reveal intro card — overline above the basket flip.
7. Reveal results card — under the FTR-earned line.
8. `/governance` empty state — full-width motto as the placeholder copy.

No other motto placements. Adding a 9th requires updating this ADR.

### 4. Typography scale

DESIGN.md §1 spec'd `display-xl: 64px`. We extend the scale with two
new steps for the Landing marquee:

- `display-2xl: 96px` — used in the Landing hero main headline.
- `display-3xl: 128px` — used in the Landing marquee (the
  oversized-wordmark-as-headline treatment).

Both new steps use the same Space Grotesk family, weight 500, line
height 0.95, tracking -0.04em. The rest of the scale (xl / lg / md / sm)
is unchanged.

### 5. shadcn layer — added and trimmed

**Added (9 components):** Tooltip, Command, ScrollArea, Skeleton, Tabs,
Popover, Progress, Avatar, DropdownMenu. Plus `cmdk` (Command's runtime)
and 7 Radix peer packages.

**Cut from the brief's original list:** sheet + vaul, input, select,
switch, checkbox, accordion, react-resizable-panels.

Each cut has a one-line reason:

- `sheet` + `vaul` — we use the full-screen modal for reveal; no bottom sheets.
- `input` — replaced by an inline `TextField` primitive; shadcn `input`
  adds zero value beyond `<input className="...">` for our cases.
- `select` — replaced by `Command` (palette) + a custom `<select>` shim.
- `switch` — replaced by a single-pixel binary pill.
- `checkbox` — replaced by the same pill.
- `accordion` — no accordion use; reveal cascade is bespoke motion.
- `react-resizable-panels` — LeftRail is fixed-width on this layout.

### 6. Hand-rolled primitives — kept and hardened

We **do not** delete the hand-rolled primitives — they are cheaper and
already wired. We harden them:

- `Button` — adds `loading` slot (skeleton-child, no spinner SVG).
- `MotionButton` — wraps `Button` with `whileTap={{ scale: 0.97 }}`.
- `Card` — adds `tone` variants (`default`, `danger`, `victory`).
- `Dialog` — adds `ink/85` backdrop (DESIGN.md §1 ink tokens).
- `Num` — adds `tone` prop for value-direction coloring.
- `Slider` — `fold/30` fill color (the basket-stop-loss slider).
- `StatusPill` — adds `dot` size prop (`sm | md`).

### 7. In-repo extras (no new deps)

Four small wrappers land inside the repo:

- `Countdown` — Framer Motion animated mm:ss display.
- `Kbd` — `<kbd>` element with monospace + bordered treatment.
- `Sparkline` — inline SVG 24×8 sparkline, no axis, no labels.
- `Marquee` — CSS-only horizontal marquee for the Landing ticker.

All four wrap patterns already used elsewhere; zero new packages.

### 8. Global chrome

- **TopNav** — logo image + motto + scroll-triggered surface shift
  (backdrop blur + ink/85 from y=24px down); `TooltipProvider` wraps
  the right-side icons.
- **LeftRail** — `strokeWidth: 1.5` on all icons (matches DESIGN.md
  §1 icon-stroke spec); `layoutId="leftrail-active"` FLIP indicator
  on the active route; `Tooltip` on every icon.
- **Footer** — motto micro-line + a mono-font row showing the program
  ID (`Fh6b…`) and the ER FQDN on the right.

### 9. Cross-screen utilities

- **`CommandPalette`** — `⌘K` (Mac) / `Ctrl-K` (Win/Linux) / `/` to
  open. Routes to any of the 10 routes + jumps to the last visited
  match via the recents store.
- **`NavUserMenu`** — `DropdownMenu` wrapping the wallet button.
  Shows FTR balance, win rate, team name; "Disconnect" + "Copy address".
- **`useRecentsStore`** — Zustand store with `persist` middleware
  (localStorage, key `conviction.recents.v1`); tracks last 8 visited
  match IDs.

### 10. Agency-grade copy

Every "Loading…" and "No data" placeholder is replaced with copywriter
lines. The table below records the replacements:

| Surface             | Was                       | Now                                                         |
|---------------------|---------------------------|-------------------------------------------------------------|
| Live feed empty     | "No events yet"           | "First blood hasn't been drawn. Hold the line."             |
| Leaderboard empty   | "No teams yet"            | "Waiting for the field to form. Pick your corner."          |
| Lobby empty         | "No open matches"         | "The floor is quiet. Start one."                            |
| Live chart loading  | "Loading prices…"         | "Tuning into the market."                                   |
| Birdeye 401         | "Birdeye unavailable"     | "Price feed offline — running on cached ticks."             |
| Reveal countdown    | "Revealing…"              | "Cards up."                                                 |
| Governance empty    | "No proposals"            | "The floor is yours. Propose."                              |
| Spectator empty     | "No live matches"         | "No one's bleeding yet. Watch the lobby."                   |
| Wallet not connect  | "Connect wallet"          | "Pick a wallet. Enter the arena."                           |

### 11. Palette

**No changes.** DESIGN.md §1 (`#0A0A0A` ink, `#FAFAFA` paper, accent
amber, danger ember) is the foundation. The redesign uses these tokens
everywhere — no hard-coded hex, no per-screen palette drift.

### 12. SVG conversion of logos

**Deferred.** Logos stay as PNG. PDF→SVG trace is a separate polish
task; not in the 1-day budget.

## What ships

```
app/
├── app/
│   ├── page.tsx                        # Landing — signature screen 1 (updated)
│   ├── match/[id]/live/page.tsx        # Mission Control — signature screen 2 (updated)
│   └── reveal/[id]/page.tsx            # Reveal sequence — signature screen 3 (updated)
├── components/
│   ├── ui/                             # hand-rolled + 9 shadcn additions (Tooltip, Command, ScrollArea, Skeleton, Tabs, Popover, Progress, Avatar, DropdownMenu)
│   ├── layout/                         # TopNav, LeftRail, Footer (updated)
│   ├── chrome/                         # NEW: CommandPalette, NavUserMenu, RecentsProvider
│   └── primitives/                     # NEW: Countdown, Kbd, Sparkline, Marquee
├── lib/
│   ├── store/recents.ts                # NEW: useRecentsStore (Zustand + persist)
│   ├── copy.ts                         # NEW: agency copy table
│   └── tokens.ts                       # UPDATED: display-2xl/3xl scale steps
└── public/
    ├── favicon.svg                     # NEW (generated from wordmark PNG)
    └── wordmark-*.png                  # unchanged
```

Plus:

- `docs/CHANGELOG.md` — one-line entry (Phase 8 source-only).
- `docs/PLAN.md` — one-paragraph note appended at end of Phase B section.
- `CLAUDE.md` — "Current phase" line updated; visual-redesign tasks
  removed from "Next 3–5 tasks".

## Consequences

- **Favicon generated.** A favicon was emitted from the wordmark PNG at
  the redesign size; lands at `app/public/favicon.svg`.
- **`docs/design-tokens.json` still stale.** DESIGN.md §1 wins. The
  brief's JSON is now two phases out of date and is not touched in
  Phase 8 — there is no palette change to record.
- **`spike/` still exists.** Carried from Phase B. Safe to delete once
  Phase 8 ships; that deletion is a Phase C housekeeping item, not
  Phase 8 scope.
- **No new runtime dependencies on the data layer.** `real.ts` is
  unchanged. The visual pass is presentation-only.
- **On-chain program unchanged.** Phase 8 ships no Anchor changes;
  `target/deploy/conviction.so` is byte-identical to Phase 7.
- **9 new packages** land in `package.json`:
  `@radix-ui/react-tooltip`, `@radix-ui/react-scroll-area`,
  `@radix-ui/react-tabs`, `@radix-ui/react-popover`,
  `@radix-ui/react-progress`, `@radix-ui/react-avatar`,
  `@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog` (re-confirmed
  peer), `cmdk`. Tailwind plugin count + 0 (no `@tailwindcss/forms`,
  no `@tailwindcss/typography`).
- **CLAUDE.md line count stays under cap.** Phase 8 adds a one-line
  "Current phase" change + one bullet under "Next 3–5 tasks" (Vercel
  deploy) — under the 300-line hard cap (currently 167).
- **The 300-LOC source-file cap holds.** Every new file is ≤150 LOC
  (hand-rolled primitives + chrome + primitives average ~80 LOC each;
  Landing hero is the largest at 144).

## Verification (14 pre-flight checks)

Run before declaring Phase 8 paused:

1. **Single-CTA per screen.** Landing has exactly one `Play` CTA above
   the fold; Live round has exactly one primary action (Hold/Fold);
   Reveal has no CTA during the flip sequence.
2. **Eyebrow budget.** Each screen has at most 2 eyebrow labels
   (small-caps overlines).
3. **Signature moment per screen.** Landing has the marquee; Live has
   the price-ticker + chaos banner; Reveal has the card-flip cascade.
4. **No spinners.** Grep `app/components` for `animate-spin` and
   `Loader2`; expect zero matches.
5. **No transitions on numbers.** Grep `app/components` for
   `transition.*tabular` and `transition.*Num`; expect zero matches.
   Numbers snap.
6. **Numbers snap.** `<Num>` is used for every displayed number; the
   only `transition-*` on a numeric element is the price-tick flash
   (color + scale, not value).
7. **Exactly 8 motto touchpoints.** Grep for the literal motto
   `HOLD . RESIST . SURVIVE.`; expect exactly 8 matches in
   `.tsx`/`.mdx` (counted in §3 above).
8. **Hardcoded-hex audit.** Grep `app/components` and `app/app` for
   `#[0-9a-fA-F]{6}\b` after excluding the design-tokens export;
   expect zero matches.
9. **shadcn CSS-var audit.** Every shadcn component reads from the
   `--background`, `--foreground`, etc. CSS vars; no hex literals in
   the shadcn-emitted files.
10. **Tabular-num coverage.** Grep `app/components` for `<Num`; every
    instance has `tabular` enabled by default (verified at the
    `Num` primitive level).
11. **Reduced-motion.** Every Framer Motion animation respects
    `useReducedMotion()`; the reveal cascade has a fallback path that
    snaps in one frame.
12. **Wordmark in 3 places.** Grep for `wordmark-` in `app/components`
    and `app/app`; expect exactly 3 (TopNav, Footer, Landing stacked).
13. **Command palette.** Pressing ⌘K / Ctrl-K / `/` opens the palette;
    typing routes to one of the 10 routes + the 8 recents.
14. **Lighthouse.** Local `pnpm build && pnpm start` Lighthouse
    desktop run on `/`, `/lobby`, `/match/demo/live`, `/reveal/demo`:
    Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
    SEO ≥ 90. (The Birdeye 401 toast is gated on env var so the
    Lighthouse runs from cold cache don't fail the BPs.)

## Follow-up debt (carried forward)

- **Birdeye 401 toast gated on env var.** The Phase 4 wiring emits a
  Sonner toast on every 401; for the demo we suppress it when
  `NEXT_PUBLIC_DEMO_MODE=1`. Phase C: ship a real fallback cache
  before demo day.
- **`spike/` deletion.** Phase 0 reference is still on disk; safe to
  `git rm -r spike/` once Phase 8 ships confirmed.
- **Realtime mirror via `onAccountChange`.** The current realtime path
  is still the 3s mock subscription. Wiring the `onAccountChange`
  mirror is Phase C / D.
- **`design-tokens.json` cleanup.** Still stale; out of scope until
  the next design change forces a sync.
