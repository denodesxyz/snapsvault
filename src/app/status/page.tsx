import type { Metadata } from 'next'
import { EmptyState } from '@/components/empty-state'
import { SectionHeader } from '@/components/section-header'
import { DailyChart } from '@/components/status/daily-chart'
import { FeedTimeline } from '@/components/status/feed-timeline'
import { FeedsTable } from '@/components/status/feeds-table'
import { LocalTime, RelativeTime } from '@/components/local-time'
import { seriesPalette } from '@/components/status/format'
import { StatusBanner } from '@/components/status/status-banner'
import { SystemSection } from '@/components/status/system-section'
import { formatBytes } from '@/lib/snapshot-utils'
import { getStatus } from '@/lib/status'
import type { StatusData } from '@/lib/status-model'

// Rendered per request from data cached for 60 seconds and expired after every sync run (lib/status.ts), never at build time.
export const dynamic = 'force-dynamic'

const statusTitle = 'Status | SnapsVault'
const statusDescription = 'System status, snapshot history and sync status of every contributor feed in the SnapsVault marketplace'

export const metadata: Metadata = {
  title: statusTitle,
  description: statusDescription,
  alternates: { canonical: '/status' },
  openGraph: {
    title: statusTitle,
    description: statusDescription,
    url: 'https://celestia.snapsvault.xyz/status',
    siteName: 'SnapsVault',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SnapsVault' }],
    locale: 'en_US',
    type: 'website',
  },
}

async function readStatus(): Promise<StatusData | null> {
  try {
    return await getStatus()
  } catch (error) {
    console.error('Status page: database read failed:', error instanceof Error ? error.name : 'UnknownError')
    return null
  }
}

const NA = <span className='text-muted-foreground'>N/A</span>

const StatCard = ({ value, title, description }: { value: React.ReactNode, title: string, description: React.ReactNode }) => (
  <div className='flex min-w-0 flex-col gap-2 p-4 xs:p-6 rounded-md bg-secondary-background'>
    <span className='text-2xl leading-8 xs:text-3xl xs:leading-9 font-bold text-foreground break-words'>{value}</span>
    <p className='text-base xs:text-lg font-semibold'>{title}</p>
    <p className='text-sm text-muted-foreground'>{description}</p>
  </div>
)

export default async function StatusPage() {
  const status = await readStatus()
  const palette = seriesPalette([...(status?.rows.map(row => row.contributor) ?? []), ...(status?.dailyNew.contributors ?? [])])
  const lastSyncAt = status?.lastSyncAt ?? null
  const totals = status?.totals
  const newest = totals?.newestSnapshot ?? null
  const historyDown = status?.partial.history ?? false

  return (
    <div className='w-full h-full flex flex-col gap-4 py-8'>
      <section className='flex flex-col gap-4 p-8 bg-secondary-background rounded-md'>
        <h1 className='text-3xl font-semibold'>Status</h1>
        <p className='text-sm text-muted-foreground max-w-[640px]'>
          The marketplace reads the registry and every contributor feed every 2 minutes. This page shows the result of those syncs and updates after every sync
        </p>
        <p className='text-sm text-muted-foreground'>
          {lastSyncAt ? (
            <>Last sync <RelativeTime time={lastSyncAt} /></>
          ) : (
            'No completed sync on record'
          )}
        </p>
      </section>

      {status && (
        <>
          {status.partial.system ? (
            <section className='w-full rounded-md border p-4 xs:p-8'>
              <EmptyState title='System history unavailable' description='Try again in a minute' />
            </section>
          ) : (
            <>
              <StatusBanner state={status.system.overall} />
              <SystemSection system={status.system} />
            </>
          )}

          <section className='w-full rounded-md border p-4 xs:p-8 flex flex-col gap-4'>
            <SectionHeader title='Totals' subtitle='Everything the marketplace has indexed' />
            <div className='grid grid-cols-2 base:grid-cols-4 gap-3 xs:gap-4'>
              <StatCard value={historyDown ? NA : totals!.snapshotsAllTime} title='Snapshots indexed' description='All time' />
              <StatCard value={totals!.snapshotsCurrent} title='Current snapshots' description='Listed in the marketplace' />
              <StatCard value={totals!.contributors} title='Contributors' description='With a feed' />
              <StatCard value={totals!.feeds} title='Feeds' description='By chain ID and type' />
              <StatCard value={totals!.chainIds} title='Chain IDs' description='Covered' />
              <StatCard
                value={totals!.dataAvailableBytes > 0 ? formatBytes(totals!.dataAvailableBytes, 1) : NA}
                title='Data available'
                description='Total size of current snapshots'
              />
              <StatCard
                value={newest ? <RelativeTime time={newest.time} /> : NA}
                title='Newest snapshot'
                description={newest ? `${newest.contributor}, ${newest.chain_id}` : 'No snapshots indexed'}
              />
              <StatCard
                value={lastSyncAt ? <RelativeTime time={lastSyncAt} /> : NA}
                title='Last sync'
                description={lastSyncAt ? <LocalTime time={lastSyncAt} /> : 'No completed sync on record'}
              />
            </div>
            {totals!.historySince && (
              <p className='text-sm text-muted-foreground'>Snapshot history since <LocalTime time={totals!.historySince} /></p>
            )}
          </section>

          <DailyChart data={status.dailyNew} colors={palette} unavailable={status.partial.daily} />
          <FeedTimeline
            now={new Date().toISOString()}
            unavailable={historyDown}
            feeds={status.rows.map(row => ({
              key: `${row.contributor}-${row.chain_id}-${row.type}`,
              label: row.contributor,
              detail: `${row.chain_id}, ${row.type || 'N/A'}`,
              color: palette[row.contributor] ?? 'var(--muted-foreground)',
              times: row.timeline,
            }))}
          />
        </>
      )}

      <FeedsTable rows={status?.rows ?? []} unavailable={!status} />
    </div>
  )
}
