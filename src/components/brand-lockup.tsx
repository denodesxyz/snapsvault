import React from 'react'
import Link from 'next/link'
import { BrandBadge } from './brand-badge'

const BrandLockup = ({ href = '/' }: { href?: string }) => {
  return (
    <Link href={href} className='flex items-center gap-1'>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src='/snapsvault-logo.svg' alt='' aria-hidden='true' width={32} height={32} className='w-8 h-8' />
      <span className='text-2xl font-bold mr-1'><span className='text-brand'>Snaps</span>Vault</span>
      <BrandBadge />
    </Link>
  )
}

export default BrandLockup
