'use client'

import React, { useEffect, useRef, useState } from 'react'
import { onceVisible } from '@/components/ui/reveal'

export type Endpoint = { label: string; path: string; json: string }

const ROTATE_MS = 6000

// Real responses from the marketplace API, fetched on the server and
// re-read every two minutes. The tabs rotate on their own until the viewer
// hovers or picks one, so all three endpoints get seen without a click.
const ApiExplorer = ({ endpoints }: { endpoints: Endpoint[] }) => {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [seen, setSeen] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const boxRef = useRef<HTMLDivElement>(null)

  // Rotation starts when the panel is actually in view, so the first tab is
  // what a visitor sees first instead of whatever the timer reached.
  useEffect(() => (boxRef.current ? onceVisible(boxRef.current, () => setSeen(true)) : undefined), [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setAuto(false)
    const onChange = () => { if (mq.matches) setAuto(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!auto || !seen || paused || endpoints.length < 2) return
    const t = window.setTimeout(() => {
      setActive((i) => (i + 1) % endpoints.length)
    }, ROTATE_MS)
    return () => window.clearTimeout(t)
  }, [auto, seen, paused, active, endpoints.length])

  const ep = endpoints[active]
  const running = auto && seen && !paused

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const n = endpoints.length
    let next: number
    if (e.key === 'ArrowRight') next = (active + 1) % n
    else if (e.key === 'ArrowLeft') next = (active - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    setAuto(false)
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      ref={boxRef}
      className='rounded-md border border-border overflow-hidden bg-background flex flex-col h-[450px]'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false) }}
      onTouchStart={() => setPaused(true)}
    >
      {/* The divider is an inset shadow on a 1px bottom padding, so the active underline covers it without overflowing the row. */}
      <div role='tablist' aria-label='API endpoints' onKeyDown={onTabKeyDown} className='flex gap-1 px-2 pt-2 pb-px shadow-[inset_0_-1px_0_var(--color-border)]'>
        {endpoints.map((e, i) => (
          <button
            key={e.path}
            ref={(el) => { tabRefs.current[i] = el }}
            id={`sv-api-tab-${i}`}
            aria-controls='sv-api-panel'
            tabIndex={i === active ? 0 : -1}
            type='button'
            role='tab'
            aria-selected={i === active}
            onClick={() => { setActive(i); setAuto(false) }}
            className={`relative px-3 py-2 min-h-11 xs:min-h-0 text-xs font-medium whitespace-nowrap cursor-pointer ${i === active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {e.label}
            <span aria-hidden='true' className='absolute left-0 right-0 bottom-[-1px] h-[2px]'>
              {i === active && (
                <span
                  key={`${active}-${running}`}
                  className='block h-full bg-brand origin-left'
                  style={running ? { animation: `sv-tab-progress ${ROTATE_MS}ms linear forwards` } : { transform: 'scaleX(1)' }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
      <div role='tabpanel' id='sv-api-panel' aria-labelledby={`sv-api-tab-${active}`} tabIndex={0} className='flex-1 min-h-0 flex flex-col'>
      <div className='px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground truncate'>GET {ep.path}</div>
      <pre className='m-0 flex-1 min-h-0 overflow-auto px-4 py-3 text-xs leading-[18px] xs:text-[11px] xs:leading-[16px] font-mono whitespace-pre'>{ep.json}</pre>
      </div>
    </div>
  )
}

export default ApiExplorer
