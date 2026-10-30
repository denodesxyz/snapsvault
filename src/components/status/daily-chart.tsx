'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionHeader } from '@/components/section-header'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TipContent } from './tip-content'
import type { DailyNew } from '@/lib/status-model'
import { formatShortDate, formatUtcDate, SERIES_COUNT } from './format'
import { useStripTips } from './use-strip-tips'

const OTHER_COLOR = 'var(--muted-foreground)'
const OTHER_LABEL = 'Other'
const MAX_SERIES = SERIES_COUNT

const PAD = { top: 12, right: 8, bottom: 28, left: 36 }
const RANGES = [30, 90] as const
// Below this width the chart gets a shorter plot and fewer labels; text stays 11px real size.
const NARROW_PX = 640
const DEFAULT_WIDTH = 900
const MIN_LABEL_GAP_PX = 56

function niceMax(value: number): number {
  if (value <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

interface Column {
  date: string
  total: number
  parts: Array<{ name: string; color: string; count: number }>
}

export function DailyChart({ data, colors, unavailable }: { data: DailyNew; colors: Record<string, string>; unavailable?: boolean }) {
  const [range, setRange] = useState<typeof RANGES[number]>(30)
  const holder = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  // The viewBox follows the real width, so axis text keeps its size on narrow screens.
  useEffect(() => {
    const el = holder.current
    if (!el) return
    const update = () => setWidth(Math.max(280, Math.round(el.clientWidth)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [unavailable])
  const height = width < NARROW_PX ? 190 : 240

  const { columns, legend, max } = useMemo(() => {
    const days = data.days.slice(-range)
    const totals = new Map<string, number>()
    for (const day of days) for (const [name, count] of Object.entries(day.counts)) totals.set(name, (totals.get(name) ?? 0) + count)
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
    const shown = ranked.length > MAX_SERIES ? ranked.slice(0, MAX_SERIES - 1) : ranked
    const hasOther = ranked.length > shown.length
    const colorOf = new Map(shown.map(name => [name, colors[name] ?? OTHER_COLOR]))

    const columns: Column[] = days.map(day => {
      const parts = shown
        .filter(name => day.counts[name])
        .map(name => ({ name, color: colorOf.get(name)!, count: day.counts[name] }))
      if (hasOther) {
        const other = Object.entries(day.counts).filter(([name]) => !colorOf.has(name)).reduce((sum, [, count]) => sum + count, 0)
        if (other > 0) parts.push({ name: OTHER_LABEL, color: OTHER_COLOR, count: other })
      }
      return { date: day.date, total: day.total, parts }
    })
    const legend = [
      ...shown.map(name => ({ name, color: colorOf.get(name)! })),
      ...(hasOther ? [{ name: OTHER_LABEL, color: OTHER_COLOR }] : []),
    ]
    return { columns, legend, max: niceMax(Math.max(0, ...columns.map(c => c.total))) }
  }, [data, colors, range])

  const tips = useStripTips(columns.length)
  const empty = columns.every(c => c.total === 0)
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const slot = plotW / columns.length
  const barW = Math.max(1, slot - (slot > 12 ? 4 : 1.5))
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP_PX / slot))

  return (
    <section className='w-full rounded-md border p-4 xs:p-8 flex flex-col gap-4'>
      <SectionHeader
        title='New snapshots per day'
        subtitle='Snapshots by creation time, per UTC day and contributor'
        actions={
          <div role='group' aria-label='Range' className='flex items-center h-9 border rounded-md p-px gap-0.5 bg-background shadow-xs dark:bg-input/30 dark:border-input'>
            {RANGES.map(value => (
              <Button
                key={value}
                variant={range === value ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setRange(value)}
                aria-pressed={range === value}
              >
                {value} days
              </Button>
            ))}
          </div>
        }
      />
      <div ref={holder} className='w-full' />
      {unavailable ? (
        <p className='min-h-[120px] flex items-center justify-center text-sm text-muted-foreground'>Daily counts unavailable</p>
      ) : empty ? (
        <p className='min-h-[120px] flex items-center justify-center text-sm text-muted-foreground'>No new snapshots in this period</p>
      ) : (
        <>
          <TooltipProvider>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              role='group'
              aria-label={`New snapshots per day, last ${range} days`}
              {...tips.groupProps}
              className='block max-w-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'
            >
              {[0, max / 2, max].map(tick => (
                <g key={tick}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke='var(--border)' strokeWidth={1} />
                  <text x={PAD.left - 6} y={y(tick) + 4} textAnchor='end' fontSize={11} fill='var(--muted-foreground)'>{tick}</text>
                </g>
              ))}
              {columns.map((column, index) => {
                const x = PAD.left + index * slot + (slot - barW) / 2
                let top = y(0)
                return (
                  <g key={column.date}>
                    {column.parts.map(part => {
                      const h = (part.count / max) * plotH
                      top -= h
                      return <rect key={part.name} x={x} y={top} width={barW} height={h} fill={part.color} />
                    })}
                    {(columns.length - 1 - index) % labelEvery === 0 && (
                      <text x={index === columns.length - 1 ? x + barW : x + barW / 2} y={height - 8} textAnchor={index === columns.length - 1 ? 'end' : 'middle'} fontSize={11} fill='var(--muted-foreground)'>{formatShortDate(column.date)}</text>
                    )}
                    <Tooltip open={tips.isOpen(index)}>
                      <TooltipTrigger asChild>
                        <rect {...tips.itemProps(index)} x={PAD.left + index * slot} y={PAD.top} width={slot} height={plotH} fill='transparent' />
                      </TooltipTrigger>
                      {/* The trigger is the full-height column, so the tip sits beside it, not above the plot. */}
                      <TipContent side='right' align='center' sideOffset={8} collisionPadding={8}>
                        <p className='font-medium'>{formatUtcDate(column.date)} UTC</p>
                        {column.parts.length === 0 ? (
                          <p className='text-muted-foreground'>No new snapshots</p>
                        ) : (
                          <ul className='mt-1 flex flex-col gap-0.5'>
                            {column.parts.map(part => (
                              <li key={part.name} className='flex items-center gap-2'>
                                <span aria-hidden='true' className='size-2 rounded-full' style={{ background: part.color }} />
                                {part.name}: {part.count}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TipContent>
                    </Tooltip>
                  </g>
                )
              })}
            </svg>
          </TooltipProvider>
          <ul className='flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
            {legend.map(item => (
              <li key={item.name} className='flex items-center gap-2'>
                <span aria-hidden='true' className='size-2 rounded-full' style={{ background: item.color }} />
                {item.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
