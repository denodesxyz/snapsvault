import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// A published height, or a dash with a tooltip when the contributor gives none (height 0 or missing).
export function HeightValue({ height }: { height: number | null | undefined }) {
  if (height && height > 0) return <>{height.toLocaleString('en-US')}</>
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label='Height not published by the contributor' className='cursor-help rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'>N/A</span>
        </TooltipTrigger>
        <TooltipContent><p>Height not published by the contributor</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
