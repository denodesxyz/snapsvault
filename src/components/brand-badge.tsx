import React from 'react'
import { Badge } from '@/components/ui/badge'

export const BrandBadge = () => (
  <Badge tone='brand' className='text-primary-foreground bg-celestia'>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src='/celestia-logo.svg' alt='' aria-hidden='true' className='w-3.5 h-3.5' style={{ filter: 'brightness(0) invert(1)' }} />
    Celestia
  </Badge>
)
