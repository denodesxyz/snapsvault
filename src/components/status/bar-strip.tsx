'use client'

import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TipContent } from './tip-content'
import { cn } from '@/lib/utils'
import { useStripTips } from './use-strip-tips'

export interface BarStripItem {
  key: string
  className: string
  tip: string
}

// Thin vertical bars, one per item, with a tooltip per bar (hover and arrow keys).
export function BarStrip({ items, label }: { items: BarStripItem[]; label: string }) {
  const tips = useStripTips(items.length)

  return (
    <TooltipProvider>
      <div
        role='group'
        aria-label={label}
        {...tips.groupProps}
        className='flex h-7 w-full items-stretch gap-px rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'
      >
        {items.map((item, index) => (
          <Tooltip key={item.key} open={tips.isOpen(index)}>
            <TooltipTrigger asChild>
              <span {...tips.itemProps(index)} className={cn('min-w-0 flex-1 rounded-[1px]', item.className)} />
            </TooltipTrigger>
            <TipContent><p>{item.tip}</p></TipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
