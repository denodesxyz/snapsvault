import React from 'react'
import ExternalLink from '@/components/ui/external-link'
import CountUp from '@/components/ui/count-up'
import { contributorAvatarUrl, type Contributor, type Snapshot } from '@/lib/feed'
import { MARKET_URL } from '@/lib/links'
import { uniqueContributors } from '@/lib/landing-data'

const COPIES = 6

const Avatar = ({ c }: { c: Contributor }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={contributorAvatarUrl(c)} alt='' referrerPolicy='no-referrer' fetchPriority='low' decoding='async' className='w-7 h-7 rounded-full border border-foreground/20 bg-black p-0.5' />
)

const Marquee = ({ contributors }: { contributors: Contributor[] }) => {
  const items = Array.from({ length: COPIES }, () => contributors).flat()
  return (
    <div className='sv-marquee relative w-full overflow-hidden'>
      <div className='sv-marquee-track flex items-center w-max' style={{ animationDuration: `${contributors.length * 5}s` }}>
        {items.map((c, i) => (
          <span key={`${c.name}-${i}`} className='flex items-center gap-2 whitespace-nowrap pr-8' aria-hidden={i >= contributors.length ? true : undefined}>
            <Avatar c={c} />
            <span className='font-medium text-sm'>{c.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// The strip fades in with the hero's 450ms reveal delay (hero.tsx).
const Stat = ({ value, label }: { value: number; label: string }) => (
  <span className='flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap'>
    <CountUp value={value} delay={450} className='font-semibold text-foreground' />
    {label}
  </span>
)

// Live strip under the hero, same markup as the marketplace's landing strip.
// Rendered on the server from the Celestia feed; with no data it shows only
// the "Live on Celestia" link, never a wrong number.
const LiveStrip = ({ snapshots }: { snapshots: Snapshot[] | null }) => {
  const contributors = uniqueContributors(snapshots)

  return (
    <section className='w-full flex flex-col base:flex-row base:items-center gap-x-8 gap-y-3 pt-6 border-t'>
      <div className='flex flex-wrap items-center justify-center base:justify-start gap-x-8 gap-y-2 shrink-0'>
        <ExternalLink href={MARKET_URL} className='group flex items-center gap-2 py-2.5 -my-2.5'>
          <span className='text-sm text-muted-foreground'>Live on</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/celestia-logo.svg' alt='' aria-hidden='true' className='w-6 h-6' />
          <span className='text-base font-semibold underline-offset-4 group-hover:underline'>Celestia</span>
        </ExternalLink>
        {snapshots && (
          <span className='flex items-center gap-x-8 whitespace-nowrap'>
            <Stat value={snapshots.length} label='Snapshots' />
            <Stat value={contributors.length} label='Contributors' />
          </span>
        )}
      </div>
      {contributors.length > 0 && (
        <div className='min-w-0 w-full base:flex-1 base:border-l base:pl-6'>
          <Marquee contributors={contributors} />
        </div>
      )}
    </section>
  )
}

export default LiveStrip
