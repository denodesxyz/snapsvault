'use client'

import React, { useMemo } from 'react'
import Hero from '@/components/hero'
import SnapshotsGrid from '@/components/snapshots-grid'
import { useSnapshots, type SnapshotsPayload } from '@/hooks/use-snapshots'
import type { ViewMode } from '@/lib/view-mode'

// One data source for the home page: a single request, loading state and
// refresh cycle shared by the hero counts and the grid.
const HomeSnapshots = ({ initialData, initialViewMode }: { initialData: SnapshotsPayload | null, initialViewMode: ViewMode }) => {
  const { snapshots: allSnapshots, loading, error, refreshError, lastUpdated, refresh } = useSnapshots({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000,
    initialData
  })

  const snapshots = useMemo(
    () => allSnapshots.filter(s => s.network.name.toLowerCase() === 'celestia'),
    [allSnapshots]
  )

  return (
    <>
      <Hero snapshots={snapshots} loading={loading} error={error} />
      <SnapshotsGrid
        snapshots={snapshots}
        loading={loading}
        error={error}
        refreshError={refreshError}
        lastUpdated={lastUpdated}
        onRetry={refresh}
        initialViewMode={initialViewMode}
      />
    </>
  )
}

// The home page while the server reads the snapshots: the same Hero and
// SnapshotsGrid in their loading state, so the swap to content moves nothing.
// Inert until the content replaces it: a filter typed here would be lost.
const noop = () => {}
export const HomeSnapshotsSkeleton = ({ initialViewMode }: { initialViewMode: ViewMode }) => (
  <div className='contents' inert>
    <Hero snapshots={[]} loading error={null} />
    <SnapshotsGrid
      snapshots={[]}
      loading
      error={null}
      refreshError={null}
      lastUpdated={null}
      onRetry={noop}
      initialViewMode={initialViewMode}
    />
  </div>
)

export default HomeSnapshots
