"use client"

import React, { useState, useEffect } from 'react'
import { SearchIcon, RefreshIcon, LayoutGridIcon, ListIcon } from '@/components/ui/icons'
import { SnapshotCard } from '@/components/ui/snapshot-card'
import { SnapshotTable } from '@/components/ui/snapshot-table'
import { SnapshotFilters } from '@/components/ui/snapshot-filters'
import { SnapshotGridSkeleton, SnapshotTableSkeleton } from '@/components/ui/skeletons'
import { TextBar } from '@/components/ui/text-bar'
import { filterSnapshots } from '@/lib/snapshot-utils'
import type { SnapshotData } from '@/hooks/use-snapshots'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/section-header'
import { EmptyState } from '@/components/empty-state'
import { LocalTime } from '@/components/local-time'
import { VIEW_MODE_COOKIE, type ViewMode } from '@/lib/view-mode'

const persistViewMode = (mode: ViewMode) => {
  document.cookie = `${VIEW_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`
}

const isAvailable = (snapshot: Pick<SnapshotData, 'is_available' | 'is_unavailable'>) => !snapshot.is_unavailable && snapshot.is_available !== false

const validTime = (iso: string | null) => (iso && !Number.isNaN(new Date(iso).getTime()) ? iso : null)

interface SnapshotsGridProps {
  snapshots: SnapshotData[]
  loading: boolean
  error: string | null
  refreshError: string | null
  lastUpdated: string | null
  onRetry: () => void
  initialViewMode: ViewMode
}

const SnapshotsGrid = ({ snapshots, loading, error, refreshError, lastUpdated, onRetry, initialViewMode }: SnapshotsGridProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('celestia')
  const [selectedChain, setSelectedChain] = useState('all')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const networkParam = params.get('network')
    const chainParam = params.get('chain')
    if (networkParam) setSelectedNetwork(networkParam)
    if (chainParam) setSelectedChain(chainParam)
  }, [])

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    persistViewMode(mode)
  }

  const filteredSnapshots = filterSnapshots(snapshots, {
    searchQuery,
    selectedNetwork,
    selectedChain
  })

  const availableCount = snapshots.filter(isAvailable).length
  const filteredAvailableCount = filteredSnapshots.filter(isAvailable).length
  const lastUpdatedTime = validTime(lastUpdated)

  const handleFiltersChange = (newFilters: Partial<{ searchQuery: string; selectedNetwork: string; selectedChain: string }>) => {
    if (newFilters.searchQuery !== undefined) setSearchQuery(newFilters.searchQuery)
    if (newFilters.selectedNetwork !== undefined) setSelectedNetwork(newFilters.selectedNetwork)
    if (newFilters.selectedChain !== undefined) setSelectedChain(newFilters.selectedChain)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedNetwork('celestia')
    setSelectedChain('all')
  }

  const renderCards = (eagerImages: boolean) => (
    <div className='grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
      {filteredSnapshots.map((snapshot, index) => (
        <SnapshotCard
          key={`${snapshot.network.name}-${snapshot.chain}-${snapshot.block_height}-${index}`}
          {...snapshot}
          eager={eagerImages && index < 4}
        />
      ))}
    </div>
  )

  // Shown on first load only. Background refreshes keep the content mounted.
  const showSkeleton = loading && snapshots.length === 0
  const showError = !showSkeleton && error !== null && snapshots.length === 0

  return (
    <section className='w-full h-full flex flex-col gap-4 rounded-md border p-8'>
      <SectionHeader
        title='Latest snapshots'
        centerBelowMd
        subtitle={
          // A failed refresh takes the subtitle's line instead of adding one,
          // so the content below never moves.
          refreshError && snapshots.length > 0 ? (
            <span role='status'>
              {refreshError}{lastUpdatedTime ? <>. Last updated <LocalTime time={lastUpdatedTime} kind='time' /></> : ''}{' '}
              <button type='button' onClick={onRetry} className='font-medium text-foreground underline underline-offset-2 hover:text-primary-text'>
                Try again
              </button>
            </span>
          ) : (
            'The newest snapshots contributed by the community'
          )
        }
        actions={
          <>
            <SnapshotFilters
              snapshots={snapshots}
              filters={{ searchQuery, selectedNetwork, selectedChain }}
              onFiltersChange={handleFiltersChange}
            />
            <div role='group' aria-label='View' className='hidden [@media(min-width:701px)]:flex items-center h-9 border rounded-md p-px gap-0.5 bg-background shadow-xs dark:bg-input/30 dark:border-input'>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size='icon-sm'
                onClick={() => changeViewMode('cards')}
                title='Card view'
                aria-label='Card view'
                aria-pressed={viewMode === 'cards'}
              >
                <LayoutGridIcon className='h-4 w-4' />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size='icon-sm'
                onClick={() => changeViewMode('table')}
                title='Table view'
                aria-label='Table view'
                aria-pressed={viewMode === 'table'}
              >
                <ListIcon className='h-4 w-4' />
              </Button>
            </div>
          </>
        }
      />

      <div aria-busy={showSkeleton}>
        {showSkeleton ? (
          viewMode === 'table' ? (
            <>
              <div className='[@media(max-width:700px)]:hidden'><SnapshotTableSkeleton /></div>
              <div className='[@media(min-width:701px)]:hidden'><SnapshotGridSkeleton /></div>
            </>
          ) : <SnapshotGridSkeleton />
        ) : showError ? (
          <EmptyState
            title='Unable to load snapshots'
            description='Please try again shortly'
            action={
              <Button onClick={onRetry} variant='outline' className='gap-2'>
                <RefreshIcon className='h-4 w-4' />
                Try again
              </Button>
            }
          />
        ) : snapshots.length === 0 ? (
          <EmptyState title='No snapshots published yet' />
        ) : filteredSnapshots.length === 0 ? (
          <EmptyState
            icon={<SearchIcon />}
            title='No snapshots found'
            description='Nothing matches the current search and filters'
            action={
              <Button onClick={clearFilters} variant='outline'>
                Clear filters
              </Button>
            }
          />
        ) : viewMode === 'table' ? (
          // The view toggle is hidden on small screens, so a stored table view
          // shows the cards there (the wide table would only scroll sideways).
          <>
            <div className='[@media(max-width:700px)]:hidden'>
              <SnapshotTable snapshots={filteredSnapshots} />
            </div>
            <div className='[@media(min-width:701px)]:hidden'>{renderCards(false)}</div>
          </>
        ) : (
          renderCards(true)
        )}
      </div>

      {(showSkeleton || snapshots.length > 0) && (
        <div className='text-center pt-4 border-t'>
          {showSkeleton ? (
            // A bar sized and wrapped like the real line.
            <p className='text-sm' aria-hidden='true'>
              <TextBar words={[7, 2, 2, 2, 9, 4, 11]} />
            </p>
          ) : (
            <p className='text-sm text-muted-foreground' role='status' aria-live='polite'>
              Showing {filteredAvailableCount} of {availableCount} snapshots from marketplace
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export default SnapshotsGrid
