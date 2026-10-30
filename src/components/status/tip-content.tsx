'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { TooltipContent } from '@/components/ui/tooltip'

// Tooltip content rendered in a portal, so it works inside SVG and scroll containers.
export function TipContent(props: React.ComponentProps<typeof TooltipContent>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipContent {...props} />
    </TooltipPrimitive.Portal>
  )
}
