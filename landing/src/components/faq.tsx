import React from 'react'
import { Eyebrow, SECTION_TITLE } from '@/components/ui/section'
import { ChevronDownIcon } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/reveal'

const faqs = [
  {
    q: 'What is SnapsVault',
    a: 'A community-driven marketplace for node snapshots. Every snapshot is described in the same metadata format, so entries from different contributors can be compared at a glance and verified before use. The web interface covers discovery, the CLI covers automation.',
  },
  {
    q: 'Which networks are supported',
    a: 'Celestia mainnet and testnets today, with snapshots from the contributors listed on the marketplace. The format is network-agnostic, and a new network joins by adding its feeds to the registry, so coverage grows with the roadmap rather than with a rewrite.',
  },
  {
    q: 'How are snapshots verified',
    a: 'A listing carries the SHA256 checksum and the block height published by the contributor. A local hash compared with the published one confirms the archive is complete and untouched, and the height confirms it is the snapshot that was listed. Feeds are re-read every two minutes, so a stale entry does not linger.',
  },
  {
    q: 'How often are snapshots updated',
    a: 'Each contributor sets its own update period, and the marketplace picks up a new entry within two minutes of the feed changing. The exact publish time is shown on the listing, so the age of a snapshot is never a guess.',
  },
  {
    q: 'How to publish snapshots',
    a: 'Host a JSON feed in the standard format on any server, under any file name, then open a pull request that adds a contributor file to the public registry. Once merged, the marketplace reads the registry and the feed every two minutes and the snapshots appear with no further action from the contributor.',
  },
]

// Native exclusive accordion: details sharing a name close each other, the
// open one closes on click, no client JS. The list reserves the height of the
// longest open answer at the narrowest width of each breakpoint range, so the
// footer does not move between questions. Re-measure after any copy change.
const Faq = () => (
  <section id='faq' className='scroll-mt-28 w-full flex flex-col base:flex-row gap-10 base:gap-16'>
    <Reveal className='base:w-[40%] shrink-0 flex flex-col gap-3 items-center text-center base:items-start base:text-left'>
      <Eyebrow>FAQ</Eyebrow>
      <h3 className={SECTION_TITLE}>Common questions</h3>
      <p className='text-base leading-6 text-muted-foreground'>What people ask before getting started</p>
    </Reveal>
    <Reveal delay={100} className='base:flex-1 min-w-0 flex flex-col min-h-[560px] min-[360px]:min-h-[488px] 2xs:min-h-[416px] xs:min-h-[392px] sm:min-h-[376px] base:min-h-[416px] lg:min-h-[392px]'>
      {faqs.map((f, i) => (
        <details key={f.q} name='faq' open={i === 0} className='group'>
          <summary className='w-full flex items-center justify-between gap-4 py-4 text-left text-base font-medium cursor-pointer list-none transition-colors duration-200 group-open:text-brand-ink dark:group-open:text-brand'>
            {f.q}
            <ChevronDownIcon className='w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180' />
          </summary>
          <p className='sv-faq-answer pb-4 pr-8 text-sm leading-6 text-muted-foreground min-h-[96px]'>{f.a}</p>
        </details>
      ))}
    </Reveal>
  </section>
)

export default Faq
