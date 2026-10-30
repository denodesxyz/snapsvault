"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RelatedSnapshotsSection } from '@/components/related-snapshots-section'
import { useSnapshots } from '@/hooks/use-snapshots'
import { NETWORK_DATA } from '@/lib/constants'
import { classifyChainId } from '@/lib/chain-kind'

type SnapshotNotFoundProps = {
  network: string
  chain_id: string
  height: string
  contributor: string
}

export function SnapshotNotFound({ network, chain_id, height, contributor }: SnapshotNotFoundProps) {
  const { snapshots: allSnapshots, loading, error } = useSnapshots({ network })

  const chain = classifyChainId(chain_id)
  const chainLabel = chain ? ` ${chain}` : ''
  const networkName = network.charAt(0).toUpperCase() + network.slice(1)
  const currentNetworkName = Object.hasOwn(NETWORK_DATA, network) ? NETWORK_DATA[network as keyof typeof NETWORK_DATA].name : networkName

  const availableSnapshots = allSnapshots
    .filter(s =>
      s.network?.name?.toLowerCase() === network.toLowerCase() &&
      s.chain_id === chain_id
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const heightNumber = Number(height)
  const heightLabel = Number.isFinite(heightNumber) ? heightNumber.toLocaleString('en-US') : height

  return (
    <section className='w-full h-full flex flex-col gap-4 py-8'>
      <div className='w-full flex flex-col gap-4 p-8 bg-secondary-background rounded-md'>
        <h1 className='text-3xl font-semibold'>Snapshot not found</h1>
        <p className='text-sm text-muted-foreground'>
          No snapshot at height {heightLabel} from {contributor} on {currentNetworkName}{chainLabel}
        </p>
        <div>
          <Button asChild>
            <Link href='/'>Back to the marketplace</Link>
          </Button>
        </div>
      </div>

      {!error && (
        <RelatedSnapshotsSection
          title='Available snapshots'
          subtitle={`Other${chainLabel} snapshots from ${currentNetworkName}`}
          snapshots={availableSnapshots}
          emptyDescription={`No other${chainLabel} snapshots are currently available`}
          loading={loading}
        />
      )}
    </section>
  )
}
