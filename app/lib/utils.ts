import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Shared class-name helper. clsx handles conditionals, twMerge resolves
 * conflicting Tailwind utilities so a caller-supplied `className` can
 * override a component's defaults.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a signed percentage for display, e.g. 4.2 -> "+4.2%".
 * Always shows the sign so gains and losses occupy the same width — important
 * because these render in a tabular-figures lane on the leaderboard.
 */
export function formatPct(pct: number, decimals = 1): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(decimals)}%`
}

/** Format a SOL amount, e.g. 12.4 -> "12.4 SOL". */
export function formatSol(amount: number, decimals = 1): string {
  return `${amount.toFixed(decimals)} SOL`
}

/** Format a USD price with precision that scales to the magnitude. */
export function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`
  if (price >= 0.01) return `$${price.toFixed(4)}`
  // Sub-cent memecoins need the long tail to show any movement at all.
  return `$${price.toFixed(8)}`
}

/** Zero-padded mm:ss for the round timer. */
export function formatClock(minutes: number, seconds: number): string {
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Truncate a base58 address for display, e.g. "7xKX...gAsU". */
export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/** Relative time for the event feed, e.g. "12s ago". Feed-scale only. */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}
