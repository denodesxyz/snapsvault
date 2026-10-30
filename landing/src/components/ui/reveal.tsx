'use client'

import React, { useEffect, useRef, useState } from 'react'

type Tag = 'div' | 'section' | 'li' | 'ol' | 'h1' | 'p'
type RevealProps = React.HTMLAttributes<HTMLElement> & { children: React.ReactNode; delay?: number; as?: Tag; className?: string }

export const onceVisible = (el: Element, cb: () => void) => {
  if (typeof IntersectionObserver === 'undefined') {
    cb()
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        cb()
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
  )
  io.observe(el)
  return () => io.disconnect()
}

declare global {
  interface Window { __svReady?: () => void }
}

// Tells the pre-paint script (layout.tsx) that the bundle is running, so its
// 4s "show everything" safety timer is canceled.
const confirmReady = () => { window.__svReady?.() }

const RevealBase = ({ children, delay = 0, as = 'div', className, group, style, ...rest }: RevealProps & { group?: boolean }) => {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    confirmReady()
    return ref.current ? onceVisible(ref.current, () => setShown(true)) : undefined
  }, [])
  const Tag = as as React.ElementType
  return (
    <Tag
      ref={ref}
      {...rest}
      className={className}
      data-reveal={group ? 'group' : ''}
      data-in={shown ? '' : undefined}
      style={{ ...style, '--sv-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}

export const Reveal = (props: RevealProps) => <RevealBase {...props} />

export const RevealGroup = (props: RevealProps) => <RevealBase {...props} group />
