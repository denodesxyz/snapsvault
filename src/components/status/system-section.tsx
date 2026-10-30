import { SectionHeader } from '@/components/section-header'
import type { BarState, ComponentState, SystemData } from '@/lib/status-system'
import { cn } from '@/lib/utils'
import { BarStrip } from './bar-strip'
import { formatDuration, formatPct, formatUtcDate } from './format'
import { LocalTime, RelativeTime } from '@/components/local-time'

const STATE_WORD: Record<ComponentState, string> = { ok: 'Operational', stale: 'Behind', down: 'Down', unknown: 'No recent check' }
const STATE_DOT: Record<ComponentState, string> = { ok: 'bg-success', stale: 'bg-warning', down: 'bg-destructive', unknown: 'bg-muted-foreground' }

const BAR_CLASS: Record<BarState, string> = {
  ok: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-destructive',
  none: 'bg-muted-foreground/25',
}
const BAR_WORD: Record<BarState, string> = { ok: 'No failed checks', degraded: 'Some failed checks', down: 'Mostly failed checks', none: 'No data' }

export function SystemSection({ system }: { system: SystemData }) {
  const { sync } = system

  return (
    <section className='w-full rounded-md border p-4 xs:p-8 flex flex-col gap-4'>
      <SectionHeader title='System' subtitle='Checked every 5 minutes, one bar per day for the last 90 days' />
      <div className='flex flex-col'>
        {system.components.map(component => (
          <div
            key={component.id}
            className='grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-border/50 py-3 first:pt-0 last:border-b-0 md:grid-cols-[9rem_9rem_1fr_4.5rem] md:items-center'
          >
            <span className='font-medium'>{component.label}</span>
            <span className='flex items-center justify-end gap-2 text-sm md:order-none md:justify-start'>
              <span aria-hidden='true' className={cn('size-2 rounded-full', STATE_DOT[component.state])} />
              {STATE_WORD[component.state]}
            </span>
            <div className='col-span-2 md:col-span-1 md:order-none'>
              <BarStrip
                label={`${component.label}, last 90 days`}
                items={component.bars.map(bar => ({
                  key: bar.date,
                  className: BAR_CLASS[bar.state],
                  tip: `${formatUtcDate(bar.date)} UTC: ${BAR_WORD[bar.state]}`,
                }))}
              />
            </div>
            <span className='hidden text-right text-sm text-muted-foreground md:block'>{formatPct(component.uptimePct)}</span>
            <span className='col-span-2 text-xs text-muted-foreground md:hidden'>Uptime {formatPct(component.uptimePct)}</span>
          </div>
        ))}
      </div>
      {system.historySince && (
        <p className='text-sm text-muted-foreground'>
          {system.historyFull ? 'Last 90 days' : <>History since <LocalTime time={system.historySince} kind='date' /></>}
        </p>
      )}
      <dl className='grid grid-cols-1 gap-3 border-t border-border/50 pt-4 text-sm 2xs:grid-cols-3'>
        <div className='flex flex-col gap-1'>
          <dt className='text-muted-foreground'>Last sync run</dt>
          <dd className='font-medium'>
            {sync.lastRunAt ? <RelativeTime time={sync.lastRunAt} /> : 'N/A'}
          </dd>
        </div>
        <div className='flex flex-col gap-1'>
          <dt className='text-muted-foreground'>Sync success, last 24 hours</dt>
          <dd className='font-medium'>{formatPct(sync.successRate24h)}</dd>
        </div>
        <div className='flex flex-col gap-1'>
          <dt className='text-muted-foreground'>Average sync duration</dt>
          <dd className='font-medium'>{formatDuration(sync.avgDurationMs)}</dd>
        </div>
      </dl>
    </section>
  )
}
