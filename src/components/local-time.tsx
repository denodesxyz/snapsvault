'use client'

import { useSyncExternalStore } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatRelativeTime } from '@/lib/snapshot-utils'
import { formatLocal, formatUtc, type TimeKind } from '@/lib/time-format'

const subscribe = () => () => {}

// False on the server and during hydration, true afterwards, so the first client render matches the server.
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

const FOCUS = 'cursor-help rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'

function toIso(time: string | number | Date): string | undefined {
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

// A moment in the viewer's time zone (UTC until the page has hydrated); hover or focus shows it in UTC.
export function LocalTime({ time, kind = 'datetime', className = '' }: { time: string | number | Date; kind?: TimeKind; className?: string }) {
  const mounted = useMounted()
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={toIso(time)} tabIndex={0} className={`${FOCUS} ${className}`}>
            {mounted ? formatLocal(time, kind) : formatUtc(time, kind)}
          </time>
        </TooltipTrigger>
        <TooltipContent><p>{formatUtc(time, kind)}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// The age of a moment; hover or focus shows the full time in the viewer's time zone and in UTC.
export function RelativeTime({ time, className = '' }: { time: string | number | Date; className?: string }) {
  const mounted = useMounted()
  const local = formatLocal(time, 'datetime', true)
  const utc = formatUtc(time, 'datetime', true)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time suppressHydrationWarning dateTime={toIso(time)} tabIndex={0} className={`${FOCUS} ${className}`}>
            {formatRelativeTime(time)}
            <span className='sr-only'> ({mounted ? local : utc})</span>
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <p>{local}</p>
          {`${local} UTC` !== utc && <p>{utc}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// A short day and month label in the viewer's time zone (UTC until the page has hydrated).
export function LocalShortDate({ time }: { time: string | number | Date }) {
  const mounted = useMounted()
  return <>{mounted ? formatLocal(time, 'short') : formatUtc(time, 'short')}</>
}
