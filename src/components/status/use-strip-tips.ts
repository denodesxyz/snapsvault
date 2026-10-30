'use client'

import { useState, type KeyboardEvent } from 'react'

// Tooltip state for a strip of many small items (bars, dots) that is one tab stop:
// hover opens the tip of the item under the pointer, arrow keys walk the items on focus.
export function useStripTips(count: number) {
  const [hover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)

  const onKeyDown = (event: KeyboardEvent) => {
    if (count === 0) return
    const last = count - 1
    const current = focus ?? last
    let next: number | null = null
    if (event.key === 'ArrowLeft') next = Math.max(0, current - 1)
    else if (event.key === 'ArrowRight') next = Math.min(last, current + 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else if (event.key === 'Escape') setFocus(null)
    if (next !== null) {
      event.preventDefault()
      setFocus(next)
    }
  }

  return {
    groupProps: {
      tabIndex: count > 0 ? 0 : -1,
      onFocus: () => setFocus(current => current ?? count - 1),
      onBlur: () => setFocus(null),
      onKeyDown
    },
    isOpen: (index: number) => hover === index || focus === index,
    itemProps: (index: number) => ({
      onPointerEnter: () => setHover(index),
      onPointerLeave: () => setHover(current => (current === index ? null : current))
    })
  }
}
