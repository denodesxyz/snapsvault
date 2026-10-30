import React from 'react'
import { IconBadge, SectionHeader } from '@/components/ui/section'
import { RevealGroup } from '@/components/ui/reveal'
import type { IconName } from '@/components/ui/icons'

const reasons: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'file-text',
    title: 'Standardized framework',
    text: 'One unified standard every operator can rely on',
  },
  {
    icon: 'shield',
    title: 'Integrity by default',
    text: 'Each entry carries what it takes to verify it before use',
  },
  {
    icon: 'eye',
    title: 'Open by design',
    text: 'Anyone can use it, contribute to it or build on it',
  },
]

const Why = () => (
  <section id='why' className='scroll-mt-28 w-full flex flex-col gap-10'>
    <SectionHeader
      eyebrow='Why SnapsVault'
      title='A shared home for snapshots'
      text='Published by many contributors, kept in one verifiable format'
    />
    <RevealGroup className='grid grid-cols-1 base:grid-cols-3 gap-4'>
      {reasons.map((r, i) => (
        // Icon beside the text between 640 and 960, so the full-width cards stay short.
        <div key={r.title} data-reveal-item='' style={{ '--sv-i': i } as React.CSSProperties} className='flex flex-col xs:flex-row xs:items-start base:flex-col gap-2 xs:gap-4 base:gap-2 p-6 rounded-md bg-secondary-background'>
          <IconBadge name={r.icon} />
          <div className='flex flex-col gap-2'>
            <h4 className='text-lg leading-6 font-semibold xs:mt-1.5 base:mt-0'>{r.title}</h4>
            <p className='text-sm text-muted-foreground'>{r.text}</p>
          </div>
        </div>
      ))}
    </RevealGroup>
  </section>
)

export default Why
