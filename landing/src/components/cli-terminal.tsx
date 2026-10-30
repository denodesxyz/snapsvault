'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icons'
import { BANNER, ENTER_ASK, answer, bootLines, downloadDoneLines, echoLine, initialState, progressLine, renderStage, type AskSpec, type CliData, type Line, type SimState, type Stage } from '@/lib/cli-sim'

// A typeable run-through of snapsos.sh's interactive mode: same stages,
// same auto-skip and back-navigation rules, real rows from the API.

// stage null marks the "Press Enter" prompt after View link.
type Prompt = { spec: AskSpec; stage: Stage | null }

// In the server HTML too, so the box is not empty before or without JS.
const BANNER_LINE: Line = { text: BANNER, tone: 'art' }

const lineClass = (l: Line) => {
  if (l.tone === 'art') return 'whitespace-pre overflow-x-hidden text-[7px] leading-[10px] xs:text-[11px] xs:leading-[16px]'
  const wrap = l.table ? 'whitespace-pre' : 'whitespace-pre-wrap break-words'
  return `${wrap} ${l.tone === 'dim' ? 'opacity-60' : ''} ${l.tone === 'bold' ? 'font-bold' : ''}`
}

const CliTerminal = ({ data }: { data: CliData }) => {
  const [lines, setLines] = useState<Line[]>([BANNER_LINE])
  const [prompt, setPrompt] = useState('')
  const [disabled, setDisabled] = useState(true)
  const [value, setValue] = useState('')
  const askRef = useRef<Prompt | null>(null)
  const sim = useRef<SimState>(initialState())
  const timers = useRef<number[]>([])
  const engaged = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const append = useCallback((add: Line[]) => { if (add.length) setLines((l) => [...l, ...add]) }, [])
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }, [])
  const clearAll = useCallback(() => {
    timers.current.forEach((t) => { window.clearTimeout(t); window.clearInterval(t) })
    timers.current = []
  }, [])

  const ask = useCallback((spec: AskSpec, stage: Stage | null) => {
    askRef.current = { spec, stage }
    setPrompt(`${spec.label}: `)
    setDisabled(false)
    setValue('')
    later(() => { if (engaged.current) inputRef.current?.focus({ preventScroll: true }) }, 0)
  }, [later])

  const show = useCallback((stage: Stage) => {
    const view = renderStage(data, sim.current, stage)
    sim.current = view.state
    append(view.lines)
    ask(view.ask, stage)
  }, [append, ask, data])

  const download = useCallback((done: Line[]) => {
    let pct = 0
    const idx = { set: false }
    const tick = window.setInterval(() => {
      pct = Math.min(100, pct + 20 + Math.floor(Math.random() * 15))
      const bar = progressLine(pct)
      setLines((l) => {
        if (!idx.set) { idx.set = true; return [...l, bar] }
        const copy = l.slice(); copy[copy.length - 1] = bar; return copy
      })
      if (pct >= 100) {
        window.clearInterval(tick)
        later(() => {
          append(done)
          askRef.current = null
          setPrompt('')
          setDisabled(true)
        }, 250)
      }
    }, 180)
    timers.current.push(tick)
  }, [append, later])

  const boot = useCallback(() => {
    clearAll()
    setLines([BANNER_LINE])
    sim.current = initialState()
    askRef.current = null
    setPrompt('')
    setDisabled(true)
    const steps = bootLines()
    steps.forEach((step, i) => later(() => {
      append(step.lines)
      if (i === steps.length - 1) show('chain_id')
    }, step.at))
  }, [append, clearAll, later, show])

  useEffect(() => {
    boot()
    return clearAll
  }, [boot, clearAll])

  useEffect(() => {
    const box = boxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [lines, prompt])

  const onBoxClick = () => {
    engaged.current = true
    if (!disabled) inputRef.current?.focus({ preventScroll: true })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const current = askRef.current
    if (e.key !== 'Enter' || !current) return
    const raw = value
    append([echoLine(current.spec, raw)])
    setValue('')
    askRef.current = null
    if (current.stage === null) {
      append([{ text: '' }])
      show('action')
      return
    }
    const res = answer(data, sim.current, current.stage, raw)
    sim.current = res.state
    append(res.lines)
    if (res.effect === 'view-link') ask(ENTER_ASK, null)
    else if (res.effect === 'download' && res.row) download(downloadDoneLines(res.row))
    else if (res.next) show(res.next)
    else askRef.current = current
  }

  return (
    <div className='rounded-md border border-border overflow-hidden bg-term-bg text-term-fg'>
      <div className='flex items-center gap-2.5 px-3.5 py-2 border-b border-foreground/10 bg-term-bar'>
        <span className='flex gap-1.5'><i className='block w-2 h-2 rounded-full bg-frame-dot' /><i className='block w-2 h-2 rounded-full bg-frame-dot' /><i className='block w-2 h-2 rounded-full bg-frame-dot' /></span>
        <span className='font-mono text-xs xs:text-[11px] text-term-muted'>snapsos.sh playground</span>
        {/* 44px hit area around the 24px box; the margins keep the bar height. */}
        <button type='button' onClick={boot} aria-label='Restart' title='Restart' className='group ml-auto -mt-2 -mb-3 -mr-2.5 inline-flex items-center justify-center w-11 h-11 cursor-pointer'>
          <span className='mb-1 inline-flex items-center justify-center w-6 h-6 text-term-muted group-hover:text-term-fg border border-foreground/15 group-hover:border-foreground/40 rounded'>
            <Icon name='restart' className='w-3.5 h-3.5' />
          </span>
        </button>
      </div>
      <div ref={boxRef} role='log' aria-live='polite' onClick={onBoxClick} className='h-[408px] overflow-y-auto overflow-x-auto px-4 py-3 font-mono text-xs leading-[18px] xs:text-[11px] xs:leading-[16px] cursor-text'>
        {lines.map((l, i) => (
          <div key={i} className={`min-h-[16px] ${lineClass(l)}`}>{l.text || ' '}</div>
        ))}
        <div className='flex items-start flex-wrap'>
          <span className='font-bold whitespace-pre'>{prompt}</span>
          <input
            ref={inputRef}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => { engaged.current = true }}
            autoComplete='off'
            spellCheck={false}
            aria-label='Terminal input'
            className='sv-term-input flex-1 min-w-10 bg-transparent border-0 outline-none text-term-fg font-mono text-xs leading-[18px] xs:text-[11px] xs:leading-[16px] p-0 m-0 caret-brand-ink dark:caret-brand'
          />
        </div>
      </div>
    </div>
  )
}

export default CliTerminal
