'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Modal (DESIGN.md §1: 12px radius for modals, the only place we go that high).
 *
 * No shadow — separation comes from surface-elevated plus a 1px border, and an
 * opaque backdrop. The close affordance is an icon component, never an emoji or
 * a literal "×" glyph.
 *
 * Phase 8 polish: header pieces (DialogHeader / Title / Description / Footer)
 * are now their own exports so callers can lay them out however they want,
 * and so the fold-confirm / propose-modal screens can use consistent
 * semantics.
 */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal
export const DialogOverlay = DialogPrimitive.Overlay
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

/**
 * Group title + description + close button into a standard header.
 * Most callers use this — only break it apart when you need bespoke spacing.
 */
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mb-4 flex items-start justify-between gap-4',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay className="fixed inset-0 z-50 bg-ink/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
          'bg-surface-elevated border border-border rounded-lg',
          'p-6 focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-sm p-1 text-whisper transition-colors hover:text-paper"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
