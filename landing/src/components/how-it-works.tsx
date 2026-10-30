import React from 'react'
import { Band, SectionHeader } from '@/components/ui/section'
import { RevealGroup } from '@/components/ui/reveal'
import { Icon, type IconName } from '@/components/ui/icons'
import { formatSize, type Snapshot } from '@/lib/feed'
import { pickShowcaseSnapshot } from '@/lib/landing-data'

const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-6)}`

const Node = ({ i, step, title, children }: { i: number; step: string; title: string; children: React.ReactNode }) => (
  <div data-reveal-item='' style={{ '--sv-i': i } as React.CSSProperties} className='flex-1 min-w-0 flex flex-col gap-4 rounded-md border border-border bg-background p-5'>
    <div className='flex items-center gap-3'>
      <span className='shrink-0 w-7 h-7 rounded-md bg-brand/15 text-brand-ink dark:text-brand text-xs font-bold font-mono inline-flex items-center justify-center'>{step}</span>
      <h4 className='text-base leading-5 font-semibold'>{title}</h4>
    </div>
    <div className='flex-1 flex flex-col'>{children}</div>
  </div>
)

// Animated dashed connector: vertical on mobile, hidden in the 2x2 grid,
// horizontal between nodes once all four sit in one row.
const Flow = () => <span aria-hidden='true' className='sv-flow shrink-0 self-center w-[2px] h-7 base:hidden md:block md:w-6 md:h-[2px]' />

// One row style for every node: 16px pink outline icon, 14px text, divider.
const Row = ({ icon, children, value }: { icon: IconName; children: React.ReactNode; value?: React.ReactNode }) => (
  <div className='flex items-center gap-2.5 text-sm py-3 border-b border-border last:border-b-0'>
    <Icon name={icon} className='w-4 h-4 shrink-0 text-brand-ink dark:text-brand' />
    <span className={`min-w-0 leading-5 ${value !== undefined ? 'whitespace-nowrap' : ''}`}>{children}</span>
    {value !== undefined && <span className='ml-auto text-right whitespace-nowrap'>{value}</span>}
  </div>
)

// One entry per line. When key and value do not fit together the value drops
// below the key; a value wider than the card is cut with an ellipsis (full
// value in the title).
const JsonBlock = ({ entries }: { entries: [string, string][] }) => (
  <div className='rounded-md bg-term-bg border border-foreground/10 px-3.5 md:px-3 py-3 font-mono text-xs xs:text-[11px] md:text-[10px] leading-5 md:leading-[18px] text-term-fg overflow-hidden'>
    <div className='opacity-60'>{'{'}</div>
    {entries.map(([k, v], i) => (
      <div key={k} className='pl-[2ch] flex flex-wrap gap-x-[1ch]'>
        <span className='shrink-0 whitespace-nowrap'>
          <span className='text-term-key'>&quot;{k}&quot;</span>
          <span className='opacity-60'>:</span>
        </span>
        <span className='inline-flex min-w-0 max-w-full whitespace-nowrap' title={v}>
          <span className='truncate text-term-str'>&quot;{v}&quot;</span>
          {i < entries.length - 1 && <span className='shrink-0 opacity-60'>,</span>}
        </span>
      </div>
    ))}
    <div className='opacity-60'>{'}'}</div>
  </div>
)

const HowItWorks = ({ snapshots }: { snapshots: Snapshot[] | null }) => {
  const s = pickShowcaseSnapshot(snapshots)
  const sha = s?.checksum?.sha256
  const na = 'N/A'
  const feedUrl = s?.url ? 'https://snap.example.com/…' : undefined
  const feedSize = s ? (typeof s.size === 'number' ? `${s.size}GB` : s.size) : undefined
  const feedEntry: [string, string][] = [
    ['url', feedUrl ?? na],
    ['creation_date', s?.time ?? na],
    ['latest_block_height', s ? String(s.block_height) : na],
    ['size', feedSize ?? na],
    ['sha256sum', sha ? shortHash(sha) : na],
  ]

  return (
    <Band id='how-it-works'>
      <SectionHeader eyebrow='How it works' title='Register once, access anywhere' text='One entry in the registry, and the contributor is on SnapsVault via web interface and terminal' />
      <RevealGroup className='flex flex-col base:grid base:grid-cols-2 base:gap-4 md:flex md:flex-row md:items-stretch md:gap-0'>
        <Node i={0} step='01' title='Publish a feed'>
          <JsonBlock entries={feedEntry} />
        </Node>
        <Flow />
        <Node i={1} step='02' title='Submit the feed'>
          <div className='flex flex-col'>
            <Row icon='file'>Contributor metadata</Row>
            <Row icon='pull-request'>Pull request merged</Row>
            <Row icon='refresh'>Re-read every 2 minutes</Row>
            <Row icon='check-circle'>Validated by schema</Row>
          </div>
        </Node>
        <Flow />
        <Node i={2} step='03' title='Get listed'>
          <div className='flex flex-col'>
            <Row icon='cube' value={s ? (s.block_height > 0 ? s.block_height.toLocaleString('en-US') : 'N/A') : na}>Block height</Row>
            <Row icon='weight' value={s ? formatSize(s.size) : na}>Size</Row>
            <Row icon='grid' value={s ? <span className='capitalize'>{s.type}</span> : na}>Type</Row>
            <Row icon='layers' value={sha ? shortHash(sha) : 'N/A'}>SHA256</Row>
          </div>
        </Node>
        <Flow />
        <Node i={3} step='04' title='Restore a node'>
          <div className='flex flex-col'>
            <Row icon='search'>Find one by chain ID and type</Row>
            <Row icon='shield'>Verify the checksum</Row>
            <Row icon='download'>Download with one click</Row>
            <Row icon='server'>Unpack and start the node</Row>
          </div>
        </Node>
      </RevealGroup>
    </Band>
  )
}

export default HowItWorks
