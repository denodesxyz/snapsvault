'use client'

import { SectionHeader } from '@/components/section-header'
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LocalShortDate } from '@/components/local-time'
import { formatLocal, formatUtc } from '@/lib/time-format'
import { TipContent } from './tip-content'
import { useStripTips } from './use-strip-tips'

const DAY_MS = 24 * 60 * 60 * 1000
export const TIMELINE_DAYS = 30

export interface TimelineFeed {
  key: string
  label: string
  detail: string
  color: string
  times: string[]
}

// The track keeps 8px of room at both ends, so a dot at either end is never clipped.
function Track({ feed, now }: { feed: TimelineFeed; now: number }) {
  const from = now - TIMELINE_DAYS * DAY_MS
  const tips = useStripTips(feed.times.length)

  return (
    <div
      role='group'
      aria-label={`${feed.label}, ${feed.detail}: ${feed.times.length} snapshots in the last ${TIMELINE_DAYS} days`}
      {...tips.groupProps}
      className='relative h-6 w-full rounded-sm border bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'
    >
      <div className='absolute inset-y-0 inset-x-2'>
        {feed.times.map((time, index) => {
          const left = ((new Date(time).getTime() - from) / (TIMELINE_DAYS * DAY_MS)) * 100
          return (
            <Tooltip key={`${time}-${index}`} open={tips.isOpen(index)}>
              <TooltipTrigger asChild>
                <span
                  {...tips.itemProps(index)}
                  style={{ left: `${Math.min(100, Math.max(0, left))}%`, background: feed.color }}
                  className='absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full'
                />
              </TooltipTrigger>
              <TipContent>
                <p>{formatLocal(time)}</p>
                {`${formatLocal(time)} UTC` !== formatUtc(time) && <p>{formatUtc(time)}</p>}
              </TipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

function Axis({ now }: { now: number }) {
  const ticks = [30, 20, 10, 0].map(daysAgo => ({ daysAgo, iso: new Date(now - daysAgo * DAY_MS).toISOString() }))
  return (
    <div className='relative h-4 w-full text-xs text-muted-foreground' aria-hidden='true'>
      <div className='absolute inset-y-0 inset-x-2'>
        {ticks.map(tick => (
          <span
            key={tick.daysAgo}
            className='absolute whitespace-nowrap'
            style={{
              left: `${(100 * (TIMELINE_DAYS - tick.daysAgo)) / TIMELINE_DAYS}%`,
              transform: tick.daysAgo === TIMELINE_DAYS ? 'translateX(-8px)' : tick.daysAgo === 0 ? 'translateX(calc(-100% + 8px))' : 'translateX(-50%)',
            }}
          >
            {tick.daysAgo === 0 ? 'Now' : <LocalShortDate time={tick.iso} />}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FeedTimeline({ feeds, now, unavailable }: { feeds: TimelineFeed[]; now: string; unavailable?: boolean }) {
  const nowMs = new Date(now).getTime()

  return (
    <section className='w-full rounded-md border p-4 xs:p-8 flex flex-col gap-4'>
      <SectionHeader title='Feed timeline' subtitle={`One dot per snapshot over the last ${TIMELINE_DAYS} days, in your local time`} />
      {unavailable ? (
        <p className='min-h-[120px] flex items-center justify-center text-sm text-muted-foreground'>Feed history unavailable</p>
      ) : feeds.length === 0 ? (
        <p className='min-h-[120px] flex items-center justify-center text-sm text-muted-foreground'>No feeds listed</p>
      ) : (
        <TooltipProvider>
          <div className='flex flex-col gap-3 md:gap-2'>
            <div className='md:grid md:grid-cols-[14rem_1fr] md:gap-4'>
              <span className='hidden md:block' />
              <Axis now={nowMs} />
            </div>
            {feeds.map(feed => (
              <div key={feed.key} className='flex flex-col gap-1 md:grid md:grid-cols-[14rem_1fr] md:items-center md:gap-4'>
                <div className='min-w-0 flex flex-col text-sm'>
                  <span className='truncate font-medium'>{feed.label}</span>
                  <span className='truncate text-xs text-muted-foreground'>{feed.detail}</span>
                </div>
                <Track feed={feed} now={nowMs} />
              </div>
            ))}
          </div>
        </TooltipProvider>
      )}
    </section>
  )
}
