'use client'

import { useEffect, useState } from 'react'
import ExternalLink from '@/components/ui/external-link'
import { Icon } from '@/components/ui/icons'
import { DOCS_URL } from '@/lib/links'

const POST_URL = `${DOCS_URL}/overview/what-is-snapsvault`
const STORAGE_KEY = 'snapsvault-announce-dismissed'
const HIDDEN_CLASS = 'sv-announce-hidden'

const AnnouncementBar = () => {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') dismiss()
    } catch {
      // localStorage unavailable - the bar simply stays
    }
  }, [])

  const dismiss = () => {
    setHidden(true)
    document.documentElement.classList.add(HIDDEN_CLASS)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (hidden) return null

  return (
    <div className='sv-announce group fixed top-0 left-0 z-50 w-full h-9 flex items-center bg-celestia text-white text-sm font-medium'>
      <div className='w-full max-w-[1390px] mx-auto px-14 flex items-center justify-center min-w-0'>
        <ExternalLink href={POST_URL} className='group/link h-9 flex items-center gap-2 min-w-0'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/celestia-logo.svg' alt='' aria-hidden='true' className='w-5 h-5 shrink-0' style={{ filter: 'brightness(0) invert(1)' }} />
          <span className='truncate'><span className='hidden xs:inline'>Introducing </span><span className='font-semibold'>Celestia Snapshot Marketplace</span></span>
          <Icon name='arrow-right' className='w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:translate-x-1' />
        </ExternalLink>
      </div>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Dismiss announcement'
        className='absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 hover:bg-white/15 cursor-pointer after:absolute after:-inset-2'
      >
        <Icon name='close' className='w-4 h-4' />
      </button>
    </div>
  )
}

export default AnnouncementBar
