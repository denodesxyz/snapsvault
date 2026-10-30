'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const POST_URL = 'https://docs.snapsvault.xyz'
const STORAGE_KEY = 'snapsvault-announce-dismissed'
const COOKIE = 'sv-announce-dismissed'
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
    document.cookie = `${COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (hidden) return null

  return (
    <div className='sv-announce group fixed top-0 left-0 z-50 w-full h-9 flex items-center bg-celestia text-primary-foreground text-sm font-medium'>
      <div className='w-full max-w-[1376px] mx-auto px-14 flex items-center justify-center min-w-0'>
      <Link href={POST_URL} target='_blank' className='group/link flex items-center gap-2 min-w-0'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src='/celestia-logo.svg' alt='' aria-hidden='true' className='w-5 h-5 shrink-0' style={{ filter: 'brightness(0) invert(1)' }} />
        <span className='truncate'><span className='hidden xs:inline'>Introducing </span><span className='font-semibold'>Celestia Snapshot Marketplace</span></span>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          className='w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:translate-x-1'
        >
          <path d='M5 12h14' />
          <path d='M13 6l6 6l-6 6' />
        </svg>
      </Link>
      </div>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Dismiss announcement'
        className='absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 hover:bg-primary-foreground/15 cursor-pointer'
      >
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className='w-4 h-4'>
          <path d='M18 6L6 18' />
          <path d='M6 6l12 12' />
        </svg>
      </button>
    </div>
  )
}

export default AnnouncementBar
