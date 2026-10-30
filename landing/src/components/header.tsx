import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ExternalLink from '@/components/ui/external-link'
import { GitHubMark } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { GITHUB_URL } from '@/lib/links'

// Same header as the marketplace app, landing variant: no badge, no extra nav.
const Header = () => (
  <header className='fixed top-9 left-0 w-full bg-background/20 backdrop-blur-sm max-h-[72px] flex justify-between items-center z-50'>
    <div className='w-full flex items-center justify-between max-w-[1390px] px-4 py-3.5 xs:py-4 mx-auto'>
      <Link href='/' className='flex items-center gap-1'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src='/snapsvault-logo.svg' alt='' aria-hidden='true' width={32} height={32} className='w-8 h-8' />
        <span className='text-2xl font-bold mr-1'><span className='text-brand'>Snaps</span>Vault</span>
      </Link>
      <div className='flex items-center gap-2'>
        <ThemeToggle />
        <Button asChild size='icon' className='size-11 xs:size-9'>
          <ExternalLink href={GITHUB_URL} aria-label='GitHub'>
            <GitHubMark />
          </ExternalLink>
        </Button>
      </div>
    </div>
  </header>
)

export default Header
