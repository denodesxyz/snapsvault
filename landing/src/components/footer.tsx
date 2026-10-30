import React from 'react'
import Link from 'next/link'
import ExternalLink from '@/components/ui/external-link'
import { DenodesWordmark } from '@/components/ui/brand'
import { DENODES_URL } from '@/lib/links'

// Same footer as the marketplace app, landing variant.
const Footer = () => (
  <footer className='w-full flex mx-auto p-4 mb-[32px]'>
    <div className='w-full bg-secondary-background px-4 py-8 flex flex-col gap-y-3 items-center rounded-md text-center'>
      <Link href='/' className='flex items-center gap-1'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src='/snapsvault-logo.svg' alt='' aria-hidden='true' width={32} height={32} className='w-8 h-8' />
        <span className='text-2xl font-bold mr-1'><span className='text-brand'>Snaps</span>Vault</span>
      </Link>
      <p className='text-sm text-muted-foreground text-center w-full max-w-[320px]'>A community-driven marketplace for sharing and discovering verified snapshots</p>
      <ExternalLink href={DENODES_URL} className='flex flex-col items-center gap-1'>
        <span className='text-sm font-medium'>Maintained by</span>
        <DenodesWordmark />
      </ExternalLink>
    </div>
  </footer>
)

export default Footer
