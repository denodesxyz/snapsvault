// Pure model of snapsos.sh's interactive mode: stages, prompts, input rules
// and back navigation. The terminal component only adds timing and the DOM.
export type CliChain = { chain_id: string; chain: string; types: string[]; label: string }
export type CliRow = { height: string; size: string; time: string; contributor: string; filename: string; download_url: string; sha256?: string }
export type CliData = { chains: CliChain[]; rows: Record<string, CliRow[]> }

// art: the banner, scaled to fit instead of wrapping. table: fixed-width
// rows that keep their columns and scroll sideways on narrow screens.
export type Line = { text: string; tone?: 'dim' | 'bold' | 'art'; table?: boolean }
export type Stage = 'chain_id' | 'type' | 'snapshot' | 'action'
export type AskSpec = { label: string; max: number | null; allowBack: boolean }
type Selection = { chain_id: string | null; chain: string | null; type: string | null; snapshot: CliRow | null }
export type SimState = { stage: Stage | null; sel: Selection; history: Stage[] }
type Effect = 'view-link' | 'download'
type StageView = { state: SimState; lines: Line[]; ask: AskSpec }
type Answer = { state: SimState; lines: Line[]; next: Stage | null; effect?: Effect; row?: CliRow }
type BootStep = { at: number; lines: Line[] }

export const BANNER = [
  '   _____                        ____  _____',
  '  / ___/____  ____ _____  _____/ __ \\/ ___/',
  '  \\__ \\/ __ \\/ __ `/ __ \\/ ___/ / / /\\__ \\',
  ' ___/ / / / / /_/ / /_/ (__  ) /_/ /___/ /',
  '/____/_/ /_/\\__,_/ .___/____/\\____//____/',
  '                /_/',
].join('\n')

export const ENTER_ASK: AskSpec = { label: 'Press Enter to return to the snapshot menu...', max: null, allowBack: false }

const ORDER: Stage[] = ['chain_id', 'type', 'snapshot', 'action']
const BACK_WORDS = ['b', 'back', '0']

const pad = (s: string | number, n: number) => String(s).padEnd(n)
const padLeft = (s: string | number, n: number) => String(s).padStart(n)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plain = (text: string): Line => ({ text })
const dim = (text: string): Line => ({ text, tone: 'dim' })
const bold = (text: string): Line => ({ text, tone: 'bold' })
const blank: Line = { text: '' }

const emptySel = (): Selection => ({ chain_id: null, chain: null, type: null, snapshot: null })

export const initialState = (): SimState => ({ stage: null, sel: emptySel(), history: [] })

export const bootLines = (): BootStep[] => [
  { at: 320, lines: [blank, bold('SnapsOS interactive mode')] },
  { at: 600, lines: [blank, plain('Terminal client for the SnapsVault snapshot marketplace,'), plain('with the same snapshot data as the web app.')] },
  { at: 880, lines: [blank, dim('Flag mode and all options: snapsos.sh --help')] },
  { at: 1200, lines: [blank, dim('Fetching available networks...')] },
  { at: 1800, lines: [dim('Automatically selected: Celestia'), blank] },
]

export const echoLine = (ask: AskSpec, raw: string): Line => bold(`${ask.label}: ${raw}`)

export const progressLine = (pct: number): Line => dim(`  ${pct}%  ${'█'.repeat(Math.round(pct / 5)).padEnd(20, '░')}`)

export const downloadDoneLines = (row: CliRow): Line[] => [
  blank,
  bold(`Saved to ${row.filename}.`),
  ...(row.sha256
    ? [dim(`Checking SHA256 of ${row.filename}...`), bold(`SHA256 match: ${row.sha256}`)]
    : [dim('No SHA256 is published for this snapshot, so the file was not checked.')]),
  dim('(Simulated for this demo, no file was downloaded)'),
  blank,
  dim('Session ended. Use the restart button to try another path.'),
]

type Parsed = { kind: 'enter' } | { kind: 'back' } | { kind: 'num'; num: number } | { kind: 'invalid'; message: string }

const parseInput = (ask: AskSpec, raw: string): Parsed => {
  if (ask.max === null) return { kind: 'enter' }
  const lower = raw.trim().toLowerCase()
  if (ask.allowBack && BACK_WORDS.includes(lower)) return { kind: 'back' }
  if (/^[0-9]+$/.test(lower)) {
    const n = parseInt(lower, 10)
    if (n >= 1 && n <= ask.max) return { kind: 'num', num: n }
  }
  return {
    kind: 'invalid',
    message: ask.allowBack ? `Invalid input. Enter a number between 1 and ${ask.max}, or 'b' to go back.` : `Invalid input. Enter a number between 1 and ${ask.max}.`,
  }
}

const chainOf = (data: CliData, sel: Selection): CliChain | null => data.chains.find((c) => c.chain_id === sel.chain_id) ?? null
const rowsOf = (data: CliData, sel: Selection): CliRow[] => (sel.chain_id && sel.type ? data.rows[`${sel.chain_id}|${sel.type}`] ?? [] : [])

const breadcrumb = (sel: Selection, withType: boolean): Line => {
  const id = sel.chain_id ?? ''
  const idPart = id.toLowerCase() === 'celestia' ? '' : ` (${id})`
  const parts = [`Celestia${idPart}`, cap(sel.chain ?? '')]
  if (withType) parts.push(cap(sel.type ?? ''))
  return dim(parts.join(' / '))
}

const ready = (data: CliData, sel: Selection, stage: Stage): boolean => {
  if (stage === 'type') return chainOf(data, sel) !== null && sel.chain !== null
  if (stage === 'snapshot') return sel.chain_id !== null && sel.chain !== null && sel.type !== null
  if (stage === 'action') return sel.chain !== null && sel.type !== null && sel.snapshot !== null
  return true
}

const menu = (data: CliData, sel: Selection, stage: Stage): { lines: Line[]; ask: AskSpec } => {
  if (stage === 'type') {
    const types = chainOf(data, sel)?.types ?? []
    return {
      lines: [breadcrumb(sel, false), plain('Available snapshot types'), ...types.map((t, i) => plain(`  ${i + 1}) ${t}`)), blank],
      ask: { label: `Select a type [1-${types.length}, or b=back]`, max: types.length, allowBack: true },
    }
  }
  if (stage === 'snapshot') {
    const rows = rowsOf(data, sel)
    const type = sel.type ?? ''
    return {
      lines: [
        breadcrumb(sel, true),
        plain('Available snapshots'),
        { ...dim('   #  HEIGHT        TYPE      SIZE        TIME (UTC)              CONTRIBUTOR'), table: true },
        ...rows.map((r, i) => ({ ...plain(`  ${padLeft(i + 1, 2)}  ${pad(r.height, 12)}  ${pad(type, 9)} ${pad(r.size, 11)}  ${pad(r.time, 23)} ${r.contributor}`), table: true })),
        blank,
      ],
      ask: { label: `Select a snapshot [1-${rows.length}, or b=back]`, max: rows.length, allowBack: true },
    }
  }
  if (stage === 'action' && sel.snapshot) {
    const r = sel.snapshot
    return {
      lines: [bold(`Selected: Celestia ${sel.chain} #${r.height} by ${r.contributor} (${sel.type})`), plain('  1) View link'), plain('  2) Download'), blank],
      ask: { label: 'Select an action [1-2, or b=back]', max: 2, allowBack: true },
    }
  }
  return {
    lines: [plain('Available chain IDs'), ...data.chains.map((c, i) => plain(`  ${i + 1}) ${c.label}`)), blank],
    ask: { label: `Select a chain ID [1-${data.chains.length}, or b=back]`, max: data.chains.length, allowBack: true },
  }
}

export const renderStage = (data: CliData, state: SimState, stage: Stage): StageView => {
  const fallback = !ready(data, state.sel, stage)
  const next: SimState = fallback ? { stage: 'chain_id', sel: emptySel(), history: [] } : { ...state, stage }
  const view = menu(data, next.sel, next.stage ?? 'chain_id')
  return { state: next, lines: view.lines, ask: view.ask }
}

const askFor = (data: CliData, state: SimState, stage: Stage): AskSpec => menu(data, state.sel, stage).ask

const goBack = (state: SimState, stage: Stage): Answer => {
  const history = state.history.slice()
  const prev = history.pop()
  if (!prev) return { state, lines: [dim('No previous step. Enter a valid choice.'), blank], next: stage }
  const sel = { ...state.sel }
  for (const st of ORDER.slice(ORDER.indexOf(prev))) {
    if (st === 'chain_id') { sel.chain_id = null; sel.chain = null }
    if (st === 'type') sel.type = null
    if (st === 'snapshot') sel.snapshot = null
  }
  return { state: { ...state, sel, history }, lines: [blank], next: prev }
}

export const answer = (data: CliData, state: SimState, stage: Stage, raw: string): Answer => {
  const parsed = parseInput(askFor(data, state, stage), raw)
  if (parsed.kind === 'invalid') return { state, lines: [dim(parsed.message)], next: null }
  if (parsed.kind === 'back') return goBack(state, stage)
  if (parsed.kind === 'enter') return { state, lines: [], next: null }
  const n = parsed.num
  const sel = state.sel

  if (stage === 'chain_id') {
    const c = data.chains[n - 1]
    const history: Stage[] = [...state.history, 'chain_id']
    if (c.types.length === 1) {
      const type = c.types[0]
      return {
        state: { ...state, sel: { ...sel, chain_id: c.chain_id, chain: c.chain, type }, history },
        lines: [blank, dim(`Automatically selected: ${type}`), blank],
        next: 'snapshot',
      }
    }
    return { state: { ...state, sel: { ...sel, chain_id: c.chain_id, chain: c.chain }, history }, lines: [blank], next: 'type' }
  }

  if (stage === 'type') {
    const types = chainOf(data, sel)?.types ?? []
    return { state: { ...state, sel: { ...sel, type: types[n - 1] ?? null }, history: [...state.history, 'type'] }, lines: [blank], next: 'snapshot' }
  }

  if (stage === 'snapshot') {
    const row = rowsOf(data, sel)[n - 1] ?? null
    return { state: { ...state, sel: { ...sel, snapshot: row }, history: [...state.history, 'snapshot'] }, lines: [blank], next: 'action' }
  }

  const row = sel.snapshot
  if (!row) return { state, lines: [], next: 'chain_id' }
  if (n === 1) return { state, lines: [blank, bold('Download URL:'), plain(row.download_url), blank], next: null, effect: 'view-link', row }
  return { state, lines: [blank, bold(`Downloading ${row.filename}...`)], next: null, effect: 'download', row }
}
