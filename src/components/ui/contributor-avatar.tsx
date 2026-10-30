'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { getContributorAvatarUrl } from '@/lib/snapshot-utils'

const FALLBACK_SRC = '/default-contributor.svg'
const KEYBASE_UPLOADS = 'https://s3.amazonaws.com/keybase_processed_uploads/'

// Raster avatars that Next can resize; SVGs and other hosts are served as they are.
const isOptimizable = (src: string) => src.startsWith('/api/keybase-avatar/') || src.startsWith(KEYBASE_UPLOADS)

interface ContributorAvatarProps {
  contributor: {
    identity?: string
    image?: string
    logo_url?: string
    name?: string
  }
  // Rendered size in px; the box keeps this size before and after the image loads.
  size: 28 | 32 | 40
  eager?: boolean
  dimmed?: boolean
}

const SIZE_CLASS = { 28: 'w-7 h-7', 32: 'w-8 h-8', 40: 'w-10 h-10' } as const

export const ContributorAvatar = ({ contributor, size, eager = false, dimmed = false }: ContributorAvatarProps) => {
  const initialSrc = getContributorAvatarUrl(contributor)
  const [src, setSrc] = useState(initialSrc)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setSrc(initialSrc)
    setLoaded(false)
  }, [initialSrc])

  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [src])

  return (
    <span
      className={`relative inline-block shrink-0 rounded-full border border-foreground/20 bg-logo-well text-logo-well-foreground ${SIZE_CLASS[size]} ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      <Image
        ref={imgRef}
        src={src}
        alt={contributor?.name || 'Contributor'}
        width={size}
        height={size}
        sizes={`${size}px`}
        loading={eager ? 'eager' : 'lazy'}
        decoding='async'
        unoptimized={!isOptimizable(src)}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== FALLBACK_SRC) setSrc(FALLBACK_SRC)
        }}
        className={`absolute inset-0 h-full w-full rounded-full p-0.5 fill-foreground transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}
