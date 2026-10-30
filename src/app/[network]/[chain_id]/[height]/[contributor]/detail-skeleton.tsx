"use client"

import { useParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { TextBar } from '@/components/ui/text-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChainStatus } from '@/components/ui/chain-status'
import { RelatedSnapshotsSection } from '@/components/related-snapshots-section'
import { SectionHeader } from '@/components/section-header'
import { ClockIcon, CodeIcon, DatabaseIcon, GitHubIcon, HeightIcon, SizeIcon, StackIcon, TwitterIcon, TypeIcon, WorldIcon } from '@/components/ui/icons'
import { classifyChainId } from '@/lib/chain-kind'
import { getNetworkInfo } from './network-info'

function DetailRow({ icon, label, words }: { icon: React.ReactNode; label: string; words: number[] }) {
  return (
    <div className='flex justify-between items-center'>
      <div className='flex items-center gap-1'>
        {icon}
        <span className='text-sm text-muted-foreground'>{label}</span>
      </div>
      <span className='text-sm font-medium'><TextBar words={words} /></span>
    </div>
  )
}

// The detail page in loading form. Everything the URL decides (network panel,
// chain, static labels) is real; snapshot and contributor data are bars
// in the same boxes, sized like typical values.
export function SnapshotDetailSkeleton() {
  const params = useParams()
  const network = (params?.network as string) || ''
  const chain_id = (params?.chain_id as string) || ''
  const chain = classifyChainId(chain_id)
  const chainLabel = chain ? ` ${chain}` : ''
  const { currentNetwork, websiteLabel, githubLabel, twitterLabel } = getNetworkInfo(network)

  return (
    <section aria-busy='true' className='w-full h-full flex flex-col gap-4 py-8'>
      <div className='grid grid-cols-1 md:grid-cols-[1.2fr_1.8fr] gap-4 w-full md:items-stretch'>
        <div className='w-full flex flex-col gap-4 p-8 bg-secondary-background rounded-md'>
          <div className='flex justify-between items-start'>
            <div className='flex items-center gap-2'>
              <img src={currentNetwork.image} alt={currentNetwork.name} width={56} height={56} decoding='async' className='w-14 h-14 rounded-full border border-foreground/20 p-1 bg-logo-well' />
              <div>
                <h1 className='text-2xl font-semibold'>{currentNetwork.name}</h1>
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
                <Skeleton className='w-10 h-10 rounded-full shrink-0' />
                <div className='flex flex-col'>
                  <p className='font-medium text-base/tight'><TextBar words={[11]} /></p>
                  <span className='text-xs text-muted-foreground'><TextBar words={[22]} /></span>
                </div>
              </div>
              <Skeleton className='size-9 rounded-md' />
            </div>
            <p className='text-sm text-muted-foreground xs:w-2/3 md:w-full'>
              <TextBar words={[9, 3, 14, 8, 3, 10, 9, 7, 8, 5, 3, 5, 5, 10]} />
            </p>
          </div>
        </div>

        <div className='w-full min-w-0 flex flex-col gap-4 p-8 rounded-md border'>
          <SectionHeader
            title='Snapshot details'
            subtitle='Complete snapshot information and download instructions'
            actionsOnTitleRow
            actions={
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Skeleton className='size-4 shrink-0 rounded-full' />
                <span><TextBar words={[4, 9, 2, 1, 5, 2, 7]} /></span>
              </div>
            }
          />

          <div className='grid grid-cols-1 2xs:grid-cols-2 gap-3 2xs:gap-4'>
            <div className='flex flex-col gap-3'>
              <DetailRow icon={<HeightIcon />} label='Block height' words={[10]} />
              <DetailRow icon={<ClockIcon />} label='Time' words={[1, 5, 3]} />
              <DetailRow icon={<SizeIcon />} label='Size' words={[3, 2]} />
            </div>

            <div className='flex flex-col gap-3'>
              <DetailRow icon={<TypeIcon />} label='Type' words={[6]} />
              <div className='flex justify-between items-center'>
                <div className='flex items-center gap-1'>
                  <StackIcon className='text-muted-foreground size-4 shrink-0' />
                  <span className='text-sm text-muted-foreground'>SHA256</span>
                </div>
                <Skeleton className='h-6 w-[154px]' />
              </div>
              <DetailRow icon={<DatabaseIcon className='text-muted-foreground size-4 shrink-0' />} label='TX index' words={[8]} />
            </div>
          </div>

          <div className='pt-4 border-t'>
            <div className='flex flex-col gap-1 mb-4'>
              <h3 className='text-base font-medium'>Download snapshot</h3>
              <p className='text-sm text-muted-foreground'>Quick download command for this snapshot</p>
            </div>

            <div className='mb-4'>
              <div className='bg-secondary-background p-3 rounded-md border font-mono text-sm flex items-center gap-2'>
                <div className='flex-1 h-5 flex items-center'>
                  <Skeleton className='h-4 w-full' />
                </div>
                <Skeleton className='size-6 rounded-sm' />
              </div>
            </div>

            <span>
              <Button disabled variant="outline" className='gap-2 opacity-50 cursor-not-allowed'>
                <CodeIcon />
                Download
              </Button>
            </span>
          </div>
        </div>
      </div>

      <RelatedSnapshotsSection
        title='More snapshots'
        subtitle={`Related${chainLabel} snapshots from ${currentNetwork.name}`}
        snapshots={[]}
        emptyDescription=''
        loading
      />
    </section>
  )
}
