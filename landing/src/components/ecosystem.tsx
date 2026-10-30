import React from 'react'
import { ArrowLink, Band, IconBadge, SectionHeader } from '@/components/ui/section'
import type { IconName } from '@/components/ui/icons'
import CliTerminal from '@/components/cli-terminal'
import ApiExplorer from '@/components/api-explorer'
import type { Network, CliSnapshot, Snapshot } from '@/lib/feed'
import { toCliData, toEndpoints } from '@/lib/landing-data'
import { DOCS_URL } from '@/lib/links'
import { RevealGroup } from '@/components/ui/reveal'

const Tool = ({ i, icon, title, text, cta, href, children }: { i: number; icon: IconName; title: string; text: string; cta: string; href: string; children: React.ReactNode }) => (
  <div data-reveal-item='' style={{ '--sv-i': i } as React.CSSProperties} className='flex flex-col gap-4 min-w-0'>
    <div className='flex flex-col items-start gap-3 xs:flex-row xs:items-center xs:justify-between xs:gap-6'>
      <div className='flex items-center gap-3 min-w-0'>
        <IconBadge name={icon} />
        <div className='flex flex-col min-w-0'>
          <h4 className='text-lg font-semibold leading-6 whitespace-nowrap'>{title}</h4>
          <p className='text-sm leading-5 text-muted-foreground'>{text}</p>
        </div>
      </div>
      <ArrowLink href={href}>{cta}</ArrowLink>
    </div>
    {children}
  </div>
)

const Fallback = ({ text }: { text: string }) => (
  <div className='rounded-md border border-dashed border-border h-[450px] flex items-center justify-center text-sm text-muted-foreground'>{text}</div>
)

const Ecosystem = ({ networks, snapshots, cliSnapshots, cliLatest }: { networks: Network[] | null; snapshots: Snapshot[] | null; cliSnapshots: CliSnapshot[] | null; cliLatest: Record<string, unknown> | null }) => {
  const cli = toCliData(networks, cliSnapshots)
  const endpoints = toEndpoints(networks, snapshots, cliLatest)
  return (
    <Band id='explore'>
      <SectionHeader eyebrow='More to explore' title='The terminal and the endpoints' />
      <RevealGroup className='grid grid-cols-1 base:grid-cols-2 gap-6'>
        <Tool i={0} icon='terminal' title='SnapsOS CLI' text='Discover, verify and download from the terminal' cta='Install' href={`${DOCS_URL}/core-components/snapsos-cli#install`}>
          {cli ? <CliTerminal data={cli} /> : <Fallback text='The terminal loads its rows from celestia.snapsvault.xyz' />}
        </Tool>
        <Tool i={1} icon='code' title='Developer API' text='Public endpoints for scripts and integrations' cta='Reference' href={`${DOCS_URL}/core-components/rest-api`}>
          {endpoints.length ? <ApiExplorer endpoints={endpoints} /> : <Fallback text='Responses load from celestia.snapsvault.xyz' />}
        </Tool>
      </RevealGroup>
    </Band>
  )
}

export default Ecosystem
