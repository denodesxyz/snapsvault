import React from 'react'
import ExternalLink from '@/components/ui/external-link'
import { Reveal } from '@/components/ui/reveal'
import { ArrowRightIcon, Icon, type IconName } from '@/components/ui/icons'

export const ArrowLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <ExternalLink href={href} className='group shrink-0 inline-flex items-center gap-2 py-3 -my-3 text-sm font-medium'>
    {children}
    <ArrowRightIcon className='w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1' />
  </ExternalLink>
)

export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className='text-sm font-semibold text-brand-ink dark:text-brand'>{children}</span>
)

// One section title for the whole page.
export const SECTION_TITLE = 'text-[28px] leading-8 xs:text-[32px] xs:leading-10 base:text-[36px] base:leading-[44px] font-semibold tracking-[-0.02em]'

export const SectionHeader = ({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) => (
  <Reveal className='w-full flex flex-col base:flex-row base:items-end base:justify-between gap-4'>
    <div className='flex flex-col gap-3 items-center text-center base:items-start base:text-left max-w-[760px] mx-auto base:mx-0'>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className={SECTION_TITLE}>{title}</h3>
      {text && <p className='text-base leading-6 text-muted-foreground'>{text}</p>}
    </div>
  </Reveal>
)

// Every other section sits in a band like the hero, so the page alternates
// open and filled areas instead of stacking same-weight blocks.
export const Band = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section id={id} className='scroll-mt-28 w-full rounded-md bg-secondary-background p-6 xs:p-8 base:p-12 flex flex-col gap-10'>{children}</section>
)

export const IconBadge = ({ name }: { name: IconName }) => (
  <span className='flex items-center justify-center shrink-0 rounded-md bg-brand/15 w-9 h-9'>
    <Icon name={name} className='w-5 h-5 stroke-brand' />
  </span>
)

export type Status = 'completed' | 'deployed' | 'live' | 'active' | 'next' | 'planned'
