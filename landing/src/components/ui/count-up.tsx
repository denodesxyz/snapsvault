'use client'

import React, { useEffect, useRef, useState } from 'react'
import { onceVisible } from '@/components/ui/reveal'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Server HTML and the first client render show the final value; the count
// only runs in the browser with motion allowed. The width is pinned to the
// final number while counting so the label next to it never moves. delay
// matches a parent reveal, so the count is not spent while still invisible.
const CountUp = ({ value, duration = 1200, delay = 0, className }: { value: number; duration?: number; delay?: number; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)
  const [width, setWidth] = useState<number>()

  useEffect(() => {
    const el = ref.current
    if (!el || value <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setWidth(el.getBoundingClientRect().width)
    setDisplay(0)
    let raf = 0
    const stop = onceVisible(el, () => {
      const start = performance.now() + delay
      const tick = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - start) / duration))
        setDisplay(Math.round(easeOutCubic(t) * value))
        if (t < 1) raf = requestAnimationFrame(tick)
        else setWidth(undefined)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => {
      stop()
      cancelAnimationFrame(raf)
      setDisplay(value)
      setWidth(undefined)
    }
  }, [value, duration, delay])

  return (
    <span ref={ref} className={className} style={width === undefined ? undefined : { width, whiteSpace: 'nowrap' }}>
      {display}
    </span>
  )
}

export default CountUp
