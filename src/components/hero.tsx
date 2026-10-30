import React, { useMemo } from 'react'
import { Button } from './ui/button'
import type { SnapshotData } from '@/hooks/use-snapshots'
import { Skeleton } from './ui/skeleton'
import Link from 'next/link'

// Same card language as the landing's feature cards: tinted icon badge,
// then the value, title and description stacked on the secondary background.
// value null = unknown (the feed failed): a muted N/A in the same slot, never a fake 0.
const HeroCard = ({ icon, value, title, description, loading = false }: { icon: React.ReactNode, value: number | null, title: string, description: string, loading?: boolean }) => (
  <div className='flex flex-col items-center text-center md:items-stretch md:text-left gap-2 p-4 xs:p-6 rounded-md bg-secondary-background'>
    <span className='flex items-center justify-center shrink-0 w-9 h-9 rounded-md bg-primary/15 text-primary-text'>
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className='w-5 h-5'>
        {icon}
      </svg>
    </span>
    {loading ? (
      <Skeleton className='h-9 w-16 mt-1' />
    ) : value === null ? (
      <span className='text-3xl leading-9 font-bold text-muted-foreground mt-1'>N/A</span>
    ) : (
      <span className='text-3xl leading-9 font-bold text-foreground mt-1'>{value}</span>
    )}
    <p className='text-lg font-semibold'>{title}</p>
    <p className='text-sm text-muted-foreground'>{description}</p>
  </div>
)

// Data comes from the page's single useSnapshots call (shared with the grid).
const Hero = ({ snapshots, loading, error }: { snapshots: SnapshotData[], loading: boolean, error: string | null }) => {
  const stats = useMemo(() => {
    if (error && !snapshots.length) return { totalSnapshots: null, totalContributors: null }

    // Configuration-only entries (is_unavailable) cannot be downloaded, so they
    // do not count as available snapshots or active contributors.
    const available = snapshots.filter(s => !s.is_unavailable && s.is_available !== false)
    const uniqueContributors = new Set(available.map(s => s.contributor.name))

    return {
      totalSnapshots: available.length,
      totalContributors: uniqueContributors.size
    }
  }, [snapshots, error])

  return (
    <section className='grid grid-cols-1 gap-4 w-full md:grid-cols-[1.6fr_1.4fr]'>

      <div className='relative flex flex-col items-center text-center md:items-stretch md:text-left gap-4 p-8 bg-secondary-background rounded-md overflow-hidden'>
        <img
          src='/celestia-logo.svg'
          alt=''
          aria-hidden='true'
          className='pointer-events-none select-none absolute -right-10 -bottom-10 w-56 h-56 opacity-[0.07]'
        />
        <h1 className='relative text-3xl font-semibold'>Celestia Snapshot Marketplace</h1>
        <p className='relative text-sm text-muted-foreground max-w-[640px]'>
          A community-driven marketplace for sharing and discovering verified snapshots for the Celestia network across mainnet and testnet, published by trusted contributors
        </p>
        <div className='flex items-center justify-center md:justify-start gap-2'>
          <Button asChild>
            <Link href='https://docs.snapsvault.xyz' target='_blank' rel='noopener noreferrer'>
              Documentation
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='https://docs.snapsvault.xyz/contributing/list-your-snapshots' target='_blank' rel='noopener noreferrer'>
              Contribute
            </Link>
          </Button>
        </div>
      </div>

      <div className='grid gap-4 grid-cols-2'>
        <HeroCard
          icon={
            <>
              <path d='M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' />
              <path d='M3.6 15h10.55' />
              <path d='M6.551 4.938l3.26 10.034' />
              <path d='M17.032 4.636l-8.535 6.201' />
              <path d='M20.559 14.51l-8.535 -6.201' />
              <path d='M12.257 20.916l3.261 -10.034' />
            </>
          }
          value={stats.totalSnapshots}
          title="Snapshots"
          description="Total snapshots available"
          loading={loading}
        />
        <HeroCard
          icon={
            <>
              <path d='M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' />
              <path d='M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2' />
              <path d='M16 3.13a4 4 0 0 1 0 7.75' />
              <path d='M21 21v-2a4 4 0 0 0 -3 -3.85' />
            </>
          }
          value={stats.totalContributors}
          title="Contributors"
          description="Active snapshot contributors"
          loading={loading}
        />
      </div>

    </section>
  )
}

export default Hero