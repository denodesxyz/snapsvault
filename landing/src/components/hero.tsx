import React from 'react'
import { Button } from '@/components/ui/button'
import ExternalLink from '@/components/ui/external-link'
import LiveStrip from '@/components/live-strip'
import { Reveal } from '@/components/ui/reveal'
import type { Snapshot } from '@/lib/feed'
import { DOCS_URL, MARKET_URL } from '@/lib/links'

// Hero: text on the left, the mark with its
// breathing glow on the right, the live Celestia strip under a divider.
const Hero = ({ snapshots }: { snapshots: Snapshot[] | null }) => {
  return (
    <section id='top' className='relative scroll-mt-28 w-full p-6 xs:p-8 rounded-md bg-secondary-background flex flex-col gap-6 overflow-hidden'>
      <div className='relative w-full flex flex-col base:flex-row items-start base:items-stretch base:min-h-[524px] gap-8'>
        <div className='w-full base:w-2/3 base:max-w-[660px] flex flex-col items-center text-center base:items-start base:text-left base:justify-center'>
          <Reveal as='h1' className='max-w-[392px] xs:max-w-[660px] text-[28px] leading-9 xs:text-[36px] xs:leading-[44px] base:text-[40px] base:leading-[48px] font-bold'>
            <span className='sv-brand-text block text-[24px] leading-8 xs:text-[32px] xs:leading-10 base:text-[36px] base:leading-[44px] text-brand-ink dark:text-brand'>SnapsVault</span>
            <span className='block'>Open Snapshot Marketplace</span>
          </Reveal>
          <Reveal as='p' delay={100} className='pt-2 xs:pt-3 max-w-[392px] xs:max-w-[560px] text-base leading-6 xs:text-lg xs:leading-7 text-muted-foreground'>
            A community-driven marketplace for sharing and discovering verified snapshots published by trusted contributors
          </Reveal>
          <Reveal delay={200} className='pt-8 flex flex-wrap items-center justify-center base:justify-start gap-3'>
            <Button asChild className='h-11 xs:h-9 text-on-brand hover:text-on-brand'>
              <ExternalLink href={`${DOCS_URL}/overview/what-is-snapsvault`}>Documentation</ExternalLink>
            </Button>
            <Button asChild variant='outline' className='h-11 xs:h-9'>
              <ExternalLink href={MARKET_URL}>Marketplace</ExternalLink>
            </Button>
          </Reveal>
        </div>
        <div className='w-full base:w-auto base:flex-1 base:relative base:self-stretch flex justify-center items-center'>
          <Reveal delay={150} data-reveal-scale='' className='relative w-[192px] h-[192px] xs:w-[256px] xs:h-[256px] base:w-[300px] base:h-[300px] md:w-[380px] md:h-[380px] base:absolute base:top-1/2 base:left-1/2 base:-translate-x-1/2 base:-translate-y-1/2'>
            <div
              className='sv-glow absolute inset-6 rounded-full blur-[40px] xs:blur-[48px] base:blur-[56px]'
              style={{ background: 'linear-gradient(-45deg, var(--color-brand) 50%, var(--color-brand-glow) 50%)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src='/snapsvault-logo.svg' alt='SnapsVault' className='relative w-full h-full object-contain p-4' />
          </Reveal>
        </div>
      </div>
      <Reveal delay={450} className='relative'>
        <LiveStrip snapshots={snapshots} />
      </Reveal>
    </section>
  )
}

export default Hero
