import React from 'react'
import { ThemeToggleButton } from './theme-toggle-button'
import { Button } from './ui/button'
import Link from 'next/link'
import BrandLockup from './brand-lockup'
import { GitHubIcon } from './ui/icons'

const Header = ({ offset = false, homeHref = '/' }: { offset?: boolean; homeHref?: string }) => {
  return (
    <header className={`fixed ${offset ? 'top-9' : 'top-0'} left-0 w-full bg-background/20 backdrop-blur-sm max-h-[72px] flex justify-between items-center z-50`}>
      <div className='w-full flex items-center justify-between max-w-[1390px] px-4 py-4 mx-auto'>
        <BrandLockup href={homeHref} />
        <div className='flex items-center gap-2'>
          <ThemeToggleButton />
          <Button asChild size='icon'>
            <Link href={'https://github.com/denodesxyz/snapsvault'} target='_blank' aria-label='GitHub'>
              <GitHubIcon className='size-4' />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header