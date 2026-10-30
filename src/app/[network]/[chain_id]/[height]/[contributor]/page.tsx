"use client"

import React, { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckIcon, ClockIcon, CodeIcon, CopyIcon, DatabaseIcon, DiscordIcon, GitHubIcon, HeightIcon, LinkIcon, MailIcon, RefreshIcon, SizeIcon, StackIcon, TelegramIcon, TwitterIcon, TypeIcon, WorldIcon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { ContributorAvatar } from '@/components/ui/contributor-avatar'
import { ChainStatus } from '@/components/ui/chain-status'
import { SnapshotDetailSkeleton } from './detail-skeleton'
import { SnapshotNotFound } from '@/components/snapshot-not-found'
import { RelatedSnapshotsSection } from '@/components/related-snapshots-section'
import { NotFoundPanel } from '@/components/not-found-panel'
import { SectionHeader } from '@/components/section-header'
import { useSnapshots } from '@/hooks/use-snapshots'
import { classifyChainId } from '@/lib/chain-kind'
import { formatNextUpdate, formatFileSize } from '@/lib/snapshot-utils'
import { RelativeTime } from '@/components/local-time'
import { safeDiscordName, safeMailtoHref, shellQuote, validateContributorLink, validateHttpsUrl } from '@/lib/validation/feed'
import { HeightValue } from '@/components/ui/height-value'
import { getNetworkInfo } from './network-info'

// A hash is recognised by its first and last characters, so cut it in the middle.
const middleTruncate = (h: string) => (h.length > 13 ? `${h.slice(0, 6)}…${h.slice(-6)}` : h)

export default function SnapshotDetailPage() {
  const params = useParams()
  const network = params?.network as string || ''
  const chain_id = params?.chain_id as string || ''
  const height = params?.height as string || ''
  const contributor = params?.contributor ? decodeURIComponent(params.contributor as string) : ''
  const [copied, setCopied] = useState(false)
  const [copiedWget, setCopiedWget] = useState(false)
  const [copiedDiscord, setCopiedDiscord] = useState(false)

  const { snapshots: allSnapshots, loading, error, refresh } = useSnapshots({
    network: network,
    autoRefresh: true
  })

  const { currentSnapshot, relatedSnapshots, chain } = useMemo(() => {
    const currentSnapshot = allSnapshots.find(s => 
      (s.network?.name?.toLowerCase() || '') === network.toLowerCase() && 
      s.chain_id === chain_id && 
      s.block_height.toString() === height &&
      (s.contributor?.name?.toLowerCase() || '') === contributor.toLowerCase()
    )

    const chain = classifyChainId(chain_id)

    const sameChainSnapshots = allSnapshots.filter(s => {
      const snapshotChain = classifyChainId(s.chain_id)
      return snapshotChain === chain && 
             !((s.network?.name?.toLowerCase() || '') === network.toLowerCase() && 
               s.chain_id === chain_id && 
               s.block_height.toString() === height &&
               (s.contributor?.name?.toLowerCase() || '') === contributor.toLowerCase())
    })

    const sameChainIdSnapshots = sameChainSnapshots.filter(s =>
      (s.network?.name?.toLowerCase() || '') === network.toLowerCase() &&
      s.chain_id === chain_id
    ).slice(0, 6)

    const sameContributorSnapshots = sameChainSnapshots.filter(s =>
      (s.contributor?.name?.toLowerCase() || '') === contributor.toLowerCase() &&
      !((s.network?.name?.toLowerCase() || '') === network.toLowerCase() && s.chain_id === chain_id)
    ).slice(0, 6)

    const otherNetworkSnapshots = sameChainSnapshots.filter(s =>
      (s.network?.name?.toLowerCase() || '') !== network.toLowerCase() &&
      (s.contributor?.name?.toLowerCase() || '') !== contributor.toLowerCase()
    ).slice(0, 6)
    
    const relatedSnapshots = [
      ...sameChainIdSnapshots.map(s => ({ ...s, category: 'Same Chain ID' })),
      ...sameContributorSnapshots.map(s => ({ ...s, category: 'Same contributor' })),
      ...otherNetworkSnapshots.map(s => ({ ...s, category: `Other ${chain ? (chain === 'mainnet' ? 'Mainnet ' : 'Testnet ') : ''}Networks` }))
    ].slice(0, 12)

    return { currentSnapshot, relatedSnapshots, chain }
  }, [allSnapshots, network, chain_id, height, contributor])
  const chainLabel = chain ? ` ${chain}` : ''

  const { currentNetwork, websiteLabel, githubLabel, twitterLabel } = useMemo(() => getNetworkInfo(network), [network])

  if (loading && allSnapshots.length === 0) {
    return <SnapshotDetailSkeleton />
  }

  if (error && allSnapshots.length === 0) {
    return (
      <section className='w-full h-full flex flex-col gap-4 py-8'>
        <NotFoundPanel
          title='Unable to load snapshot data'
          description='Please try again shortly'
          action={
            <Button onClick={refresh} className="gap-2">
              <RefreshIcon className='h-4 w-4' />
              Try again
            </Button>
          }
        />
      </section>
    )
  }

  if (!currentSnapshot) {
    return <SnapshotNotFound network={network} chain_id={chain_id} height={height} contributor={contributor} />
  }

  const contributorWebsite = validateContributorLink(currentSnapshot.contributor.website)
  const contributorX = validateContributorLink(currentSnapshot.contributor.x)
  const contributorTelegram = validateContributorLink(currentSnapshot.contributor.telegram)
  const discordName = safeDiscordName(currentSnapshot.contributor.discord)
  const mailtoHref = safeMailtoHref(currentSnapshot.contributor.email)
  const nextUpdate = currentSnapshot.period && currentSnapshot.period !== 'unknown'
    ? formatNextUpdate(new Date(currentSnapshot.time).getTime(), currentSnapshot.period)
    : null

  return (
    <section className='w-full h-full flex flex-col gap-4 py-8'>
      <div className='grid grid-cols-1 md:grid-cols-[1.2fr_1.8fr] gap-4 w-full md:items-stretch'>
        <div className='w-full flex flex-col gap-4 p-8 bg-secondary-background rounded-md'>
          <div className='flex justify-between items-start'>
            <div className='flex items-center gap-2'>
              <img src={currentNetwork.image} alt={currentNetwork.name} width={56} height={56} decoding='async' className='w-14 h-14 rounded-full border border-foreground/20 p-1 bg-logo-well' />
              <div>
                <h1 className='text-2xl font-semibold'>
                  {currentNetwork.name}
                  <span className='sr-only'> snapshot{currentSnapshot.block_height > 0 ? ` ${currentSnapshot.block_height.toLocaleString('en-US')}` : ''}</span>
                </h1>
                <p className='text-xs text-muted-foreground'>{chain_id}</p>
              </div>
            </div>
            <ChainStatus chain={chain} />
          </div>
          <p className='text-sm text-muted-foreground xs:w-2/3 md:w-full'>{currentNetwork.description}</p>
          
          <div className='flex items-center gap-2 h-[30px]'>
            {currentNetwork.category.map((cat, index) => (
              <Badge key={index} tone='tag'>{cat}</Badge>
            ))}
          </div>

          {(websiteLabel || githubLabel || twitterLabel) && (
            <div className='flex flex-wrap gap-2 border-t pt-4'>
              {websiteLabel && (
                <Button asChild variant="outline" size="sm" className="gap-2 max-w-full">
                  <a href={currentNetwork.socials.website} target="_blank" rel="noopener noreferrer">
                    <WorldIcon />
                    <span className='truncate'>{websiteLabel}</span>
                  </a>
                </Button>
              )}
              {githubLabel && (
                <Button asChild variant="outline" size="sm" className="gap-2 max-w-full">
                  <a href={currentNetwork.socials.github} target="_blank" rel="noopener noreferrer">
                    <GitHubIcon />
                    <span className='truncate'>{githubLabel}</span>
                  </a>
                </Button>
              )}
              {twitterLabel && (
                <Button asChild variant="outline" size="sm" className="gap-2 max-w-full">
                  <a href={currentNetwork.socials.twitter} target="_blank" rel="noopener noreferrer">
                    <TwitterIcon />
                    <span className='truncate'>{twitterLabel}</span>
                  </a>
                </Button>
              )}
            </div>
          )}

          <div className='pt-4 border-t'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-3'>
                <ContributorAvatar contributor={currentSnapshot.contributor} size={40} eager />
                <div className='flex flex-col'>
                  <p className='font-medium text-base/tight'>{currentSnapshot.contributor.name}</p>
                  {currentSnapshot.contributor.email && (
                    <span className='text-xs text-muted-foreground'>{currentSnapshot.contributor.email}</span>
                  )}
                </div>
              </div>
              
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Contact ${currentSnapshot.contributor.name}`}
                    title={`Contact ${currentSnapshot.contributor.name}`}
                  >
                    <LinkIcon className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {contributorWebsite.ok && (
                    <DropdownMenuItem asChild>
                      <a href={contributorWebsite.value} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                        <WorldIcon />
                        Website
                      </a>
                    </DropdownMenuItem>
                  )}
                  {contributorX.ok && (
                    <DropdownMenuItem asChild>
                      <a href={contributorX.value} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                        <TwitterIcon />
                        X (Twitter)
                      </a>
                    </DropdownMenuItem>
                  )}
                  {contributorTelegram.ok && (
                    <DropdownMenuItem asChild>
                      <a href={contributorTelegram.value} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                        <TelegramIcon />
                        Telegram
                      </a>
                    </DropdownMenuItem>
                  )}
                  {discordName && (
                    <DropdownMenuItem
                      onSelect={event => {
                        event.preventDefault()
                        navigator.clipboard.writeText(discordName)
                        setCopiedDiscord(true)
                        setTimeout(() => setCopiedDiscord(false), 2000)
                      }}
                      aria-label={`Copy Discord username ${discordName}`}
                      className='flex items-center gap-2'
                    >
                      {copiedDiscord ? <CheckIcon className='text-success' /> : <DiscordIcon />}
                      Discord
                    </DropdownMenuItem>
                  )}
                  {mailtoHref && (
                    <DropdownMenuItem asChild>
                      <a href={mailtoHref} className='flex items-center gap-2'>
                        <MailIcon />
                        Email
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {currentSnapshot.contributor.description && (
              <p className='text-sm text-muted-foreground xs:w-2/3 md:w-full'>
                {currentSnapshot.contributor.description}
              </p>
            )}
          </div>
        </div>

        <div className='w-full min-w-0 flex flex-col gap-4 p-8 rounded-md border'>
          <SectionHeader
            title='Snapshot details'
            subtitle='Complete snapshot information and download instructions'
            actionsOnTitleRow
            actions={
              nextUpdate ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        tabIndex={0}
                        className='flex items-center gap-2 cursor-help text-sm text-muted-foreground rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                      >
                        <ClockIcon className='size-4 shrink-0 stroke-muted-foreground' />
                        <span>{nextUpdate}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Updated every {currentSnapshot.period}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null
            }
          />

          <div className='grid grid-cols-1 2xs:grid-cols-2 gap-3 2xs:gap-4'>
            <div className='flex flex-col gap-3'>
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <HeightIcon />
                  <span className='text-sm text-muted-foreground'>Block height</span>
                </div>
                <span className='text-sm font-medium'><HeightValue height={currentSnapshot.block_height} /></span>
              </div>

              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <ClockIcon />
                  <span className='text-sm text-muted-foreground'>Time</span>
                </div>
                <RelativeTime time={currentSnapshot.time} className='text-sm font-medium' />
              </div>
              
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <SizeIcon />
                  <span className='text-sm text-muted-foreground'>Size</span>
                </div>
                <span className='text-sm font-medium'>{formatFileSize(currentSnapshot.size)}</span>
              </div>
            </div>

            <div className='flex flex-col gap-3'>
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <TypeIcon />
                  <span className='text-sm text-muted-foreground'>Type</span>
                </div>
                <span className='text-sm font-medium capitalize'>{currentSnapshot.type}</span>
              </div>
              
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <StackIcon className='text-muted-foreground size-4 shrink-0' />
                  <span className='text-sm text-muted-foreground'>SHA256</span>
                </div>
                <div className='flex items-center gap-2'>
                  {currentSnapshot.checksum?.sha256 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='h-6 font-mono text-sm bg-secondary-background border pl-1.5 rounded-md flex items-center gap-1'>
                            <code className='w-[120px] truncate text-center'>{middleTruncate(currentSnapshot.checksum.sha256)}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(currentSnapshot.checksum?.sha256 || '')
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                              }}
                              className='size-6 rounded-sm'
                              aria-label="Copy SHA256"
                              title="Copy SHA256"
                            >
                              {copied ? (
                                <CheckIcon className='size-3.5 text-success' />
                              ) : (
                                <CopyIcon className='size-3.5' />
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className='font-mono text-xs'>{currentSnapshot.checksum.sha256}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className='text-sm text-muted-foreground'>N/A</span>
                  )}
                </div>
              </div>

              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <DatabaseIcon className='text-muted-foreground size-4 shrink-0' />
                  <span className='text-sm text-muted-foreground'>TX index</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className={`w-2 h-2 rounded-full ${currentSnapshot.tx_index === 'true' ? 'bg-success' : 'bg-destructive'}`} />
                  <span className='text-sm font-medium'>{currentSnapshot.tx_index === 'true' ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className='pt-4 border-t'>
            <div className='flex flex-col gap-1 mb-4'>
              <h3 className='text-base font-medium'>Download snapshot</h3>
              <p className='text-sm text-muted-foreground'>Quick download command for this snapshot</p>
            </div>
            
            {validateHttpsUrl(currentSnapshot.url).ok && (
              <div className='mb-4'>
                <div className='bg-secondary-background p-3 rounded-md border font-mono text-sm flex items-center gap-2'>
                  <code className='sv-scroll overflow-x-auto whitespace-nowrap flex-1'>wget {shellQuote(currentSnapshot.url)}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`wget ${shellQuote(currentSnapshot.url)}`)
                      setCopiedWget(true)
                      setTimeout(() => setCopiedWget(false), 2000)
                    }}
                    className='size-6 rounded-sm'
                    aria-label="Copy wget command"
                    title="Copy wget command"
                  >
                    {copiedWget ? (
                      <CheckIcon className='size-3.5 text-success' />
                    ) : (
                      <CopyIcon className='size-3.5' />
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {validateHttpsUrl(currentSnapshot.url).ok && (
              <Button asChild variant="outline" className='gap-2'>
                <a href={currentSnapshot.url} download rel="noopener noreferrer">
                  <CodeIcon />
                  Download
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <RelatedSnapshotsSection
        title='More snapshots'
        subtitle={`Related${chainLabel} snapshots from ${currentNetwork.name}`}
        snapshots={relatedSnapshots}
        emptyDescription={`No other${chainLabel} snapshots are currently available`}
      />

      <span role='status' aria-live='polite' className='sr-only'>
        {copied || copiedWget || copiedDiscord ? 'Copied to clipboard' : ''}
      </span>
    </section>
  )
}