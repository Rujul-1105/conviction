'use client'

import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

/**
 * Slider, used for the stop-loss threshold picker.
 *
 * Styled in fold red because that is what it configures — the point at which
 * the position auto-folds (DESIGN.md §1: fold red is for stop-loss triggers).
 * The 4px radius on the track matches input styling, not button styling.
 */
export function Slider({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-sm bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-fold" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          'block h-4 w-4 rounded-full border-2 border-fold bg-ink',
          'transition-colors duration-150',
          'hover:bg-fold focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      />
    </SliderPrimitive.Root>
  )
}
