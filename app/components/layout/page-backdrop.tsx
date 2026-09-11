/**
 * PageBackdrop — ambient background wrapper for non-landing routes.
 *
 * Provides two soft layers behind every non-landing screen so they read as
 * one designed system:
 *  - A vertical ink scrim (from-ink/95 → via-ink/85 → to-ink/80) that
 *    deepens at the top and fades at the bottom — reads as one canvas.
 *  - A conviction-green radial accent anchored top-right, mirroring the
 *    hero so the page-to-page handoff feels continuous.
 *
 * Pure CSS, SSR-safe (no client-only state), no Math.random — keeps the
 * page hydration-clean so Vercel deploys ship without hydration warnings.
 */
export function PageBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen flex-1 overflow-hidden">
      {/* Soft vertical scrim so foreground content stays legible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/95 via-ink/85 to-ink/80"
      />
      {/* Conviction-green radial accent — same anchor as the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[640px] w-[640px] rounded-full bg-conviction/[0.04] blur-[120px]"
      />

      {/* Foreground content. */}
      <div className="relative">{children}</div>
    </div>
  )
}
