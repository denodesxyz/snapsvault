import { EmptyState } from '@/components/empty-state'
import { SectionHeader } from '@/components/section-header'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatFileSize, formatRelativeTime } from '@/lib/snapshot-utils'
import { formatLocal, formatUtc } from '@/lib/time-format'
import type { FeedStatus, StatusRow } from '@/lib/status-model'
import { cn } from '@/lib/utils'
import { formatInterval, formatPct } from './format'

const STATUS_LABEL: Record<FeedStatus, string> = {
  ok: 'OK',
  stale: 'Stale',
  failing: 'Failing',
}

const STATUS_DOT: Record<FeedStatus, string> = {
  ok: 'bg-success',
  stale: 'bg-muted-foreground',
  failing: 'bg-destructive',
}

const FOCUS = 'cursor-help rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'

const COLUMNS = ['Contributor', 'Chain ID', 'Type', 'Status', 'Newest snapshot', 'Period', 'Actual interval', 'Snapshots (all time)', 'Feed uptime']

const rowKey = (row: StatusRow) => `${row.contributor}-${row.chain_id}-${row.type}`

function StatusBadge({ row }: { row: StatusRow }) {
  const badge = (
    <Badge tone='tag' className='gap-1.5'>
      <span aria-hidden='true' className={cn('size-2 rounded-full', STATUS_DOT[row.status])} />
      {STATUS_LABEL[row.status]}
    </Badge>
  )
  if (!row.reason) return badge
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn('inline-flex', FOCUS)}>
          {badge}
          <span className='sr-only'> ({row.reason})</span>
        </span>
      </TooltipTrigger>
      <TooltipContent><p>{row.reason}</p></TooltipContent>
    </Tooltip>
  )
}

function NewestSnapshot({ row }: { row: StatusRow }) {
  if (!row.newestSnapshotAt) return <>N/A</>
  const at = row.newestSnapshotAt
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time suppressHydrationWarning dateTime={at} tabIndex={0} className={FOCUS}>{formatRelativeTime(at)}</time>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formatLocal(at, 'datetime', true)}</p>
        {`${formatLocal(at, 'datetime', true)} UTC` !== formatUtc(at, 'datetime', true) && <p>{formatUtc(at, 'datetime', true)}</p>}
        {row.newestHeight !== null && (
          <p>{row.newestHeight > 0 ? `Height ${row.newestHeight.toLocaleString('en-US')}` : 'Height not published'}</p>
        )}
        {row.newestSize && formatFileSize(row.newestSize) !== 'N/A' && <p>Size {formatFileSize(row.newestSize)}</p>}
      </TooltipContent>
    </Tooltip>
  )
}

const typeLabel = (row: StatusRow) => row.type || 'N/A'

export function FeedsTable({ rows, unavailable }: { rows: StatusRow[]; unavailable: boolean }) {
  return (
    <section className='w-full rounded-md border p-4 xs:p-8 flex flex-col gap-4'>
      <SectionHeader title='Feeds' subtitle='One row per contributor, chain ID and snapshot type' />
      {unavailable ? (
        <EmptyState title='Status unavailable' description='Try again in a minute' />
      ) : rows.length === 0 ? (
        <EmptyState title='No feeds listed' description='Feeds appear here after the first sync' />
      ) : (
        <TooltipProvider>
          <div className='relative hidden w-full overflow-x-auto rounded-md border [scrollbar-width:thin] md:block'>
            <table className='w-full text-sm'>
              <caption className='sr-only'>Feed status</caption>
              <thead>
                <tr className='border-b bg-secondary-background text-left text-muted-foreground'>
                  {COLUMNS.map(label => (
                    <th key={label} scope='col' className='py-2 px-3 font-medium whitespace-nowrap'>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={rowKey(row)} className='border-b border-border/50 last:border-b-0'>
                    <td className='py-3 px-3 font-medium whitespace-nowrap'>{row.contributor}</td>
                    <td className='py-3 px-3 whitespace-nowrap'>{row.chain_id}</td>
                    <td className='py-3 px-3 capitalize whitespace-nowrap'>{typeLabel(row)}</td>
                    <td className='py-3 px-3'><StatusBadge row={row} /></td>
                    <td className='py-3 px-3 whitespace-nowrap'><NewestSnapshot row={row} /></td>
                    <td className='py-3 px-3 whitespace-nowrap'>{row.period}</td>
                    <td className='py-3 px-3 whitespace-nowrap'>{formatInterval(row.actualIntervalHours)}</td>
                    <td className='py-3 px-3 whitespace-nowrap'>{row.snapshotsAllTime}</td>
                    <td className='py-3 px-3 whitespace-nowrap'>{formatPct(row.uptimePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className='flex flex-col gap-3 md:hidden'>
            {rows.map(row => (
              <li key={rowKey(row)} className='flex flex-col gap-3 rounded-md border p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 flex-col'>
                    <span className='font-medium'>{row.contributor}</span>
                    <span className='text-xs text-muted-foreground'>{row.chain_id}, {typeLabel(row)}</span>
                  </div>
                  <StatusBadge row={row} />
                </div>
                <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
                  <dt className='text-muted-foreground'>Newest</dt><dd><NewestSnapshot row={row} /></dd>
                  {row.period && (<><dt className='text-muted-foreground'>Period</dt><dd>{row.period}</dd></>)}
                  {row.actualIntervalHours !== null && (<><dt className='text-muted-foreground'>Interval</dt><dd>{formatInterval(row.actualIntervalHours)}</dd></>)}
                  <dt className='text-muted-foreground'>All time</dt><dd>{row.snapshotsAllTime}</dd>
                  <dt className='text-muted-foreground'>Uptime</dt><dd>{formatPct(row.uptimePct)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </TooltipProvider>
      )}
    </section>
  )
}
