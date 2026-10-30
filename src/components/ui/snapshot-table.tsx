import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons'
import { ChainStatus } from '@/components/ui/chain-status'
import { ContributorAvatar } from '@/components/ui/contributor-avatar'
import { relativeUrl } from '@/lib/public-names'
import { formatFileSize, parseSizeToBytes } from '@/lib/snapshot-utils'
import { RelativeTime } from '@/components/local-time'
import { HeightValue } from '@/components/ui/height-value'
import { validateContributorLink } from '@/lib/validation/feed'
import type { SnapshotData } from '@/components/ui/snapshot-card'

interface SnapshotTableProps {
  snapshots: SnapshotData[]
}

type SortField = 'network' | 'chain' | 'height' | 'time' | 'size' | 'type' | 'contributor'
type SortDirection = 'asc' | 'desc'

const COLUMNS: { field: SortField; label: string; defaultDirection: SortDirection }[] = [
  { field: 'network', label: 'Network', defaultDirection: 'asc' },
  { field: 'chain', label: 'Chain', defaultDirection: 'asc' },
  { field: 'height', label: 'Height', defaultDirection: 'desc' },
  { field: 'time', label: 'Time', defaultDirection: 'desc' },
  { field: 'size', label: 'Size', defaultDirection: 'desc' },
  { field: 'type', label: 'Type', defaultDirection: 'asc' },
  { field: 'contributor', label: 'Contributor', defaultDirection: 'asc' },
]

const compareSnapshots = (a: SnapshotData, b: SnapshotData, field: SortField): number => {
  switch (field) {
    case 'network':
      return (a.network?.name || '').localeCompare(b.network?.name || '')
    case 'chain':
      return (a.chain || '').localeCompare(b.chain || '')
    case 'height':
      return a.block_height - b.block_height
    case 'time':
      return (new Date(a.time).getTime() || 0) - (new Date(b.time).getTime() || 0)
    case 'size':
      return parseSizeToBytes(a.size) - parseSizeToBytes(b.size)
    case 'type':
      return (a.type || '').localeCompare(b.type || '')
    case 'contributor':
      return (a.contributor?.name || '').localeCompare(b.contributor?.name || '')
  }
}

const Row = ({ eager, ...snapshot }: SnapshotData & { eager: boolean }) => {
  const { network, chain, chain_id, block_height, time, size, type, contributor, is_available = true, is_unavailable = false, unavailable_reason } = snapshot
  const isUnavailableSnapshot = is_unavailable || !is_available
  const contributorWebsite = validateContributorLink(contributor?.website)
  const detailHref = `/${network.name.toLowerCase()}/${chain_id}/${block_height}/${encodeURIComponent(contributor?.name || 'unknown')}`

  return (
    <tr className={`border-b border-border/50 ${isUnavailableSnapshot ? 'bg-secondary-background/50' : 'hover:bg-secondary-background/50 transition-colors'}`}>
      <td className='py-3 px-3'>
        <div className='flex items-center gap-2'>
          <div className='relative flex shrink-0'>
            <img src={relativeUrl(network.image)} alt={network.name} width={28} height={28} loading={eager ? 'eager' : 'lazy'} decoding='async' className={`w-7 h-7 rounded-full border border-foreground/20 bg-logo-well p-0.5 ${isUnavailableSnapshot ? 'opacity-50' : ''}`} />
            {isUnavailableSnapshot && (
              <div title={unavailable_reason} className='absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center'>
                <div className='w-2 h-2 bg-destructive rounded-full animate-pulse'></div>
              </div>
            )}
          </div>
          <div className='flex flex-col'>
            {isUnavailableSnapshot ? (
              <span className='font-medium text-muted-foreground'>{network.name}</span>
            ) : (
              <Link href={detailHref} prefetch={false} className='font-medium hover:underline hover:text-primary-text'>{network.name}</Link>
            )}
            <span className='text-xs text-muted-foreground'>{chain_id}</span>
            {isUnavailableSnapshot && unavailable_reason && (
              <span className='text-xs text-muted-foreground'>{unavailable_reason}</span>
            )}
          </div>
        </div>
      </td>
      <td className='py-3 px-3'><ChainStatus chain={chain} /></td>
      <td className='py-3 px-3 whitespace-nowrap'>{isUnavailableSnapshot ? 'N/A' : <HeightValue height={block_height} />}</td>
      <td className='py-3 px-3 whitespace-nowrap'>
        {isUnavailableSnapshot ? (
          'N/A'
        ) : (
          <RelativeTime time={time} />
        )}
      </td>
      <td className='py-3 px-3 whitespace-nowrap'>{isUnavailableSnapshot ? 'N/A' : formatFileSize(size)}</td>
      <td className='py-3 px-3 capitalize whitespace-nowrap'>{isUnavailableSnapshot ? 'N/A' : type}</td>
      <td className='py-3 px-3'>
        <div className='flex items-center gap-2'>
          <ContributorAvatar contributor={contributor} size={28} eager={eager} dimmed={isUnavailableSnapshot} />
          {contributorWebsite.ok && !isUnavailableSnapshot ? (
            <Link href={contributorWebsite.value} className='font-medium hover:underline whitespace-nowrap'>
              {contributor?.name || 'N/A'}
            </Link>
          ) : (
            <span className={`font-medium whitespace-nowrap ${isUnavailableSnapshot ? 'text-muted-foreground' : ''}`}>
              {contributor?.name || 'N/A'}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

export const SnapshotTable = ({ snapshots }: SnapshotTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedSnapshots = useMemo(() => {
    if (!sortField) return snapshots
    const multiplier = sortDirection === 'asc' ? 1 : -1
    return [...snapshots].sort((a, b) => multiplier * compareSnapshots(a, b, sortField))
  }, [snapshots, sortField, sortDirection])

  const handleSort = (field: SortField, defaultDirection: SortDirection) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(defaultDirection)
    }
  }

  return (
    <div className='sv-scroll relative w-full overflow-x-auto rounded-md border'>
      <table className='w-full text-sm'>
        <caption className='sr-only'>Latest snapshots</caption>
        <thead>
          <tr className='border-b bg-secondary-background text-left text-muted-foreground'>
            {COLUMNS.map(({ field, label, defaultDirection }) => {
              const isActive = sortField === field
              return (
                <th
                  key={field}
                  scope='col'
                  className='py-2 px-3 font-medium'
                  aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button
                    type='button'
                    aria-label={`Sort by ${label}`}
                    onClick={() => handleSort(field, defaultDirection)}
                    className={`inline-flex items-center gap-1 cursor-pointer font-medium hover:text-foreground transition-colors ${isActive ? 'text-foreground' : ''}`}
                  >
                    {label}
                    {isActive && (sortDirection === 'asc' ? <ChevronUpIcon className='h-3 w-3' /> : <ChevronDownIcon className='h-3 w-3' />)}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedSnapshots.map((snapshot, index) => (
            <Row key={`${snapshot.network.name}-${snapshot.chain}-${snapshot.block_height}-${index}`} {...snapshot} eager={index < 4} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
