import React from 'react'
import { SectionHeader, type Status } from '@/components/ui/section'
import { Icon, type IconName } from '@/components/ui/icons'
import { RevealGroup } from '@/components/ui/reveal'

// Gray circle for every item, the status shows only in the icon color.
const statusColor: Record<Status, string> = {
  completed: 'text-green-600 dark:text-green-400',
  deployed: 'text-green-600 dark:text-green-400',
  live: 'text-green-600 dark:text-green-400',
  active: 'text-yellow-600 dark:text-yellow-400',
  next: 'text-brand-ink dark:text-brand',
  planned: 'text-muted-foreground',
}

type Milestone = { title: string; text: string; status: Status; logo?: string }
type Release = { version: string; title: string; status: Status; items: Milestone[] }

const releases: Release[] = [
  {
    version: 'v0',
    title: 'Foundation',
    status: 'completed',
    items: [
      { title: 'Unified framework', text: 'One format for every snapshot', status: 'completed' },
      { title: 'Marketplace UI', text: 'Search, filter and download online', status: 'deployed' },
      { title: 'SnapsOS CLI', text: 'Terminal client for the marketplace', status: 'deployed' },
    ],
  },
  {
    version: 'v1',
    title: 'First light',
    status: 'live',
    items: [
      { title: 'Celestia network', text: 'Mainnet and testnets supported', status: 'live', logo: '/celestia-logo.svg' },
      { title: 'Contributor onboarding', text: 'New contributors join by pull request', status: 'live' },
    ],
  },
  {
    version: 'v1.1',
    title: 'Open and programmable',
    status: 'active',
    items: [
      { title: 'Developer API', text: 'Public endpoints for automation', status: 'deployed' },
      { title: 'Integrity score', text: 'Contributor freshness and history', status: 'next' },
      { title: 'Open source', text: 'The whole stack is public', status: 'completed' },
    ],
  },
  {
    version: 'v2',
    title: 'Network expansion',
    status: 'planned',
    items: [
      { title: 'More networks', text: 'The schema extended to new networks', status: 'planned' },
      { title: 'Contributor profiles', text: 'Joined date, networks and score', status: 'planned' },
    ],
  },
]

// Segment to the next release: solid once shipped, animated dashes while in
// progress, muted dashes when still planned (the border token is too faint on
// white to read as a road).
const segment = (next: Status) => {
  if (next === 'planned' || next === 'next') return 'bg-[repeating-linear-gradient(90deg,color-mix(in_oklch,var(--color-muted-foreground)_40%,transparent)_0_6px,transparent_6px_12px)]'
  if (next === 'active') return 'sv-flow'
  return 'bg-brand'
}
const started = (s: Status) => s !== 'planned' && s !== 'next'

const statusIcon: Record<Status, IconName> = {
  completed: 'check-circle',
  deployed: 'cloud-check',
  live: 'live',
  active: 'loader',
  next: 'code',
  planned: 'calendar',
}

const Roadmap = () => (
  <section id='roadmap' className='scroll-mt-28 w-full flex flex-col gap-10'>
    <SectionHeader eyebrow='Roadmap' title='The road so far and ahead' text='From the first spec to what ships next' />
    <RevealGroup as='ol' className='grid grid-cols-1 xs:grid-cols-2 base:grid-cols-4 gap-x-6 gap-y-10'>
      {releases.map((r, i) => {
        const next = releases[i + 1]
        const active = started(r.status)
        return (
          <li key={r.version} data-reveal-item='' style={{ '--sv-i': i } as React.CSSProperties} className='relative flex flex-col gap-5'>
            {/* Same badge language as the How it works steps: version in a mono badge, title beside it. */}
            {/* Titles may wrap to two lines between 960 and 1280, so every header row reserves that height to keep the item lists aligned. */}
            <div className='flex items-center gap-3 min-w-0 base:min-h-10 lg:min-h-0'>
              <span className={`shrink-0 inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold font-mono ${active ? 'bg-brand/15 text-brand-ink dark:text-brand' : 'bg-foreground/10 text-muted-foreground'}`}>{r.version}</span>
              <h4 className={`min-w-0 text-base font-semibold leading-5 ${active ? '' : 'text-muted-foreground'}`}>{r.title}</h4>
              {next && <span aria-hidden='true' className={`hidden base:block flex-1 min-w-4 h-[2px] mr-[-24px] ${segment(next.status)}`} />}
            </div>
            <ul className='flex flex-col gap-3'>
              {r.items.map((m) => (
                <li key={m.title} className='flex items-center gap-3'>
                  <span className='w-10 shrink-0 flex justify-center'>
                    <span className='w-[22px] h-[22px] rounded-full inline-flex items-center justify-center bg-foreground/10'>
                      {m.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.logo} alt='' aria-hidden='true' className='w-[13px] h-[13px]' />
                      ) : (
                        <Icon name={statusIcon[m.status]} className={`w-[13px] h-[13px] ${statusColor[m.status]}`} />
                      )}
                    </span>
                  </span>
                  <span className='flex flex-col gap-0.5'>
                    <span className='text-sm font-medium leading-5'>{m.title}</span>
                    <span className='text-sm leading-5 text-muted-foreground'>{m.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </RevealGroup>
  </section>
)

export default Roadmap
