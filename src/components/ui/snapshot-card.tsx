'use client'

import React from 'react'
import Link from 'next/link'
import { HeightIcon, ClockIcon, SizeIcon, TypeIcon } from '@/components/ui/icons'
import { ChainStatus } from '@/components/ui/chain-status'
import { ContributorAvatar } from '@/components/ui/contributor-avatar'
import { relativeUrl } from '@/lib/public-names'
import { formatFileSize } from '@/lib/snapshot-utils'
import { LocalTime, RelativeTime } from '@/components/local-time'
import { HeightValue } from '@/components/ui/height-value'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { validateContributorLink } from '@/lib/validation/feed'

export interface SnapshotData {
  network: {
    image: string
    name: string
  }
  chain: string
  chain_id: string
  block_height: number
  time: string
  size: string | number
  type: string
  contributor: {
    name: string
    image: string
    logo_url?: string
    website?: string | undefined
    identity?: string
  }
  is_available?: boolean
  is_unavailable?: boolean
  unavailable_reason?: string
  configuration_id?: string
  period?: string
}

interface SnapshotCardProps extends SnapshotData {
  variant?: 'default' | 'carousel'
  showTimeFormat?: 'relative' | 'date'
  eager?: boolean
}

export const SnapshotCard = ({ 
  network, 
  chain, 
  chain_id,
  block_height, 
  time, 
  size, 
  type, 
  contributor,
  is_available = true,
  is_unavailable = false,
  unavailable_reason,
  eager = false,
  variant = 'default',
  showTimeFormat = 'relative'
}: SnapshotCardProps) => {
  const additionalClasses = variant === 'carousel' ? 'transition-all duration-200' : ''
  const is_unavailableSnapshot = is_unavailable || !is_available
  const website = validateContributorLink(contributor?.website)
  const detailHref = `/${network.name.toLowerCase()}/${chain_id}/${block_height}/${encodeURIComponent(contributor?.name || 'unknown')}`

  return (
    <div
      className={`group relative w-full h-full p-4 rounded-md border text-sm ${additionalClasses} ${
      is_unavailableSnapshot
        ? 'bg-secondary-background/50'
        : 'bg-secondary-background border-transparent hover:border-foreground/10'
    }`}>
      {!is_unavailableSnapshot && (
        <Link href={detailHref} prefetch={false} className="absolute inset-0 z-0" aria-label={`View ${network.name} snapshot details, height ${block_height > 0 ? block_height.toLocaleString('en-US') : 'unknown'}, from ${contributor?.name || 'unknown contributor'}`} />
      )}
      <div className='relative z-10 h-full flex flex-col gap-1 pointer-events-none'>
        <div className='flex justify-between items-start pb-2'>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <img 
                src={relativeUrl(network.image)} 
                alt={network.name} 
                width={40}
                height={40}
                loading={eager ? 'eager' : 'lazy'}
                decoding='async'
                className={`w-10 h-10 rounded-full border border-foreground/20 bg-logo-well p-0.5 ${
                  is_unavailableSnapshot ? 'opacity-50' : ''
                }`} 
              />
              {is_unavailableSnapshot && (
                <div title={unavailable_reason} className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <div>
              {is_unavailableSnapshot ? (
                <div>
                  <p className='text-base font-medium text-muted-foreground flex items-center gap-2'>
                    {network.name}
                  </p>
                </div>
              ) : (
                <>
                  <p className='text-base font-medium transition-colors group-hover:underline underline-offset-2 group-hover:text-primary-text flex items-center gap-2'>
                    {network.name}
                  </p>
                </>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className='text-xs text-muted-foreground truncate max-w-[110px] cursor-help pointer-events-auto'>{chain_id}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{chain_id}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {is_unavailableSnapshot && unavailable_reason && (
                <p className='text-xs text-muted-foreground max-w-[150px]'>{unavailable_reason}</p>
              )}
            </div>
          </div>
          <ChainStatus chain={chain} />
        </div>
      
        <div className='flex justify-between items-center'>
        
          <div className='flex items-center gap-1'>
            <HeightIcon />
            <span className='text-sm text-muted-foreground'>Height</span>
          </div>
          <span>{is_unavailableSnapshot ? 'N/A' : <HeightValue height={block_height} />}</span>
        </div>
      
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-1'>
            <ClockIcon />
            <span className='text-sm text-muted-foreground'>Time</span>
          </div>
          {is_unavailableSnapshot ? (
            <span>N/A</span>
          ) : (
            showTimeFormat === 'date'
              ? <LocalTime time={time} kind='date' className='pointer-events-auto' />
              : <RelativeTime time={time} className='pointer-events-auto' />
          )}
        </div>
        
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-1'>
            <SizeIcon />
            <span className='text-sm text-muted-foreground'>Size</span>
          </div>
          <span>{is_unavailableSnapshot ? 'N/A' : formatFileSize(size)}</span>
        </div>
      
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-1 pb-1'>
            <TypeIcon />
            <span className='text-sm text-muted-foreground'>Type</span>
          </div>
          <span className='capitalize'>{is_unavailableSnapshot ? 'N/A' : type}</span>
        </div>
      
        <div className='flex justify-between items-center border-t pt-2 mt-2'>
          <div className='flex items-center gap-1'>
            <span className='text-muted-foreground'>Contributor</span>
          </div>
          <div className='flex items-center gap-1'>
            <ContributorAvatar contributor={contributor} size={32} eager={eager} dimmed={is_unavailableSnapshot} />
            {website.ok && !is_unavailableSnapshot ? (
              <Link href={website.value} className='font-medium text-base hover:underline pointer-events-auto'>
                {contributor?.name || 'N/A'}
              </Link>
            ) : (
              <span className={`font-medium text-base ${is_unavailableSnapshot ? 'text-muted-foreground' : ''}`}>
                {contributor?.name || 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
