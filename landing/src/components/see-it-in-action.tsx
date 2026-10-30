import React from 'react'
import { Button } from '@/components/ui/button'
import ExternalLink from '@/components/ui/external-link'
import { Eyebrow } from '@/components/ui/section'
import { MARKET_URL } from '@/lib/links'
import { Reveal } from '@/components/ui/reveal'

// Real screenshots of celestia.snapsvault.xyz (header through the first rows
// of listings), one per theme, inside a landscape frame. The image is a CSS
// background, so only the active theme's file is fetched (WebKit loads lazy
// images even inside display:none). Below 640px the frame shows the left half
// at twice the scale, so the listing text stays readable.
const SeeItInAction = () => (
  <section id='web-interface' className='scroll-mt-28 w-full flex flex-col base:flex-row base:items-center gap-10 base:gap-12'>
    <Reveal className='base:w-[42%] shrink-0 flex flex-col gap-3 items-center text-center base:items-start base:text-left'>
      <Eyebrow>Web interface</Eyebrow>
      {/* Smaller than SECTION_TITLE between 960 and 1280: at 36px the title wraps in the 42% column. */}
      <h3 className='text-[28px] leading-8 xs:text-[32px] xs:leading-10 base:text-[28px] base:leading-8 md:text-[32px] md:leading-10 lg:text-[36px] lg:leading-[44px] font-semibold tracking-[-0.02em]'>Pick a snapshot in seconds</h3>
      <p className='text-base leading-6 text-muted-foreground'>The front door to SnapsVault, where the latest snapshots and the contributors behind them sit in a single view, with search, sort and filters to narrow it down</p>
      <Button asChild className='mt-3 h-11 xs:h-9 text-on-brand hover:text-on-brand'>
        <ExternalLink href={MARKET_URL}>Open the marketplace</ExternalLink>
      </Button>
    </Reveal>
    <div className='base:flex-1 min-w-0'>
      <Reveal delay={120} data-reveal-scale='' className='rounded-[20px] border-[10px] border-frame bg-frame shadow-[0_32px_80px_-32px_rgba(0,0,0,.6)]'>
        <div className='h-2' />
        <div className='rounded-[12px] overflow-hidden bg-background'>
          <div
            role='img'
            aria-label='The Celestia snapshot marketplace: header, stats and the latest listings'
            className='w-full aspect-[960/1102] bg-[length:200%_auto] bg-left-top bg-no-repeat xs:aspect-[1920/1102] xs:bg-cover xs:bg-top bg-[url(/marketplace-light.webp)] dark:bg-[url(/marketplace-dark.webp)]'
          />
        </div>
        <div className='h-2' />
      </Reveal>
    </div>
  </section>
)

export default SeeItInAction
