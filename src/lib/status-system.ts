// Pure logic for the System section of /status: per-component state, 90 day
// bars, uptime percentages, the sync run summary and the overall banner.
// Inputs are small aggregates read from the uptimechecks and syncruns collections.

export const SYSTEM_COMPONENTS = [
  { id: 'website', label: 'Website' },
  { id: 'api', label: 'API' },
  { id: 'sync', label: 'Sync' },
  { id: 'database', label: 'Database' },
  { id: 'docs', label: 'Docs' },
  { id: 'landing', label: 'Landing' }
] as const

export type ComponentId = typeof SYSTEM_COMPONENTS[number]['id']
export type ComponentState = 'ok' | 'stale' | 'down' | 'unknown'
export type BarState = 'ok' | 'degraded' | 'down' | 'none'
export type OverallState = 'operational' | 'degraded' | 'outage' | 'unknown'

export interface UptimeDayInput {
  component: string
  day: string // UTC day, YYYY-MM-DD
  total: number
  failed: number
}

export interface UptimeLatestInput {
  component: string
  at: Date | string
  ok: boolean
  first: Date | string // earliest check of the component
}

export interface SyncRunInput {
  finished_at: Date | string
  duration_ms: number
  ok: boolean
}

export interface SystemBar {
  date: string
  state: BarState
}

export interface SystemComponent {
  id: ComponentId
  label: string
  state: ComponentState
  bars: SystemBar[]
  uptimePct: number | null
  since: string | null
}

export interface SyncSummary {
  lastRunAt: string | null
  successRate24h: number | null
  avgDurationMs: number | null
}

export interface SystemData {
  overall: OverallState
  components: SystemComponent[]
  sync: SyncSummary
  historySince: string | null
  // The earliest stored check is older than the bar window, so the bars are the whole story.
  historyFull: boolean
}

export interface SystemInput {
  days: UptimeDayInput[]
  latest: UptimeLatestInput[]
  runs24h: SyncRunInput[]
  lastRunAt: Date | string | null
  lastOkRunAt?: Date | string | null
}

export const BAR_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000
// A latest check older than this no longer describes the present.
const CHECK_FRESH_MS = 15 * 60 * 1000
// The sync runs every 2 minutes; this many silent minutes is not fresh any more.
const SYNC_FRESH_MS = 15 * 60 * 1000

function ms(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

export function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

// The last `count` UTC days ending with the day of `now`, oldest first.
export function lastUtcDays(now: number, count: number): string[] {
  const today = Date.parse(utcDay(now))
  return Array.from({ length: count }, (_, i) => utcDay(today - (count - 1 - i) * DAY_MS))
}

// No data is 'none'; more than half failed is 'down'; any failure is 'degraded'.
export function barState(total: number, failed: number): BarState {
  if (total <= 0) return 'none'
  if (failed * 2 > total) return 'down'
  if (failed > 0) return 'degraded'
  return 'ok'
}

export function componentState(latest: UptimeLatestInput | undefined, now: number): ComponentState {
  const at = latest ? ms(latest.at) : null
  if (!latest || at === null || now - at > CHECK_FRESH_MS) return 'unknown'
  return latest.ok ? 'ok' : 'down'
}

// No check at all: unknown. Any component down: outage. All ok and sync fresh: operational.
export function overallState(states: ComponentState[], syncFresh: boolean, anyChecks: boolean): OverallState {
  if (!anyChecks) return 'unknown'
  if (states.includes('down')) return 'outage'
  if (states.every(s => s === 'ok') && syncFresh) return 'operational'
  return 'degraded'
}

// A passing check does not make the sync healthy when its runs have stopped succeeding.
export function syncComponentState(state: ComponentState, syncFresh: boolean): ComponentState {
  return state === 'ok' && !syncFresh ? 'stale' : state
}

export function buildSystem(input: SystemInput, lastSyncAt: string | null, now: number = Date.now()): SystemData {
  const dates = lastUtcDays(now, BAR_DAYS)
  const days = new Map<string, UptimeDayInput>()
  for (const d of input.days) days.set(`${d.component}|${d.day}`, d)
  const latestBy = new Map(input.latest.map(l => [l.component, l]))

  const runs = input.runs24h
  const lastRun = ms(input.lastRunAt)
  const lastOkRun = ms(input.lastOkRunAt)
  // Freshness rests on the last successful run; failing runs never count. Without any run
  // on record (log not started yet) the feeds' last successful fetch stands in.
  const freshnessBase = lastRun === null ? ms(lastSyncAt) : lastOkRun
  const syncFresh = freshnessBase !== null && now - freshnessBase <= SYNC_FRESH_MS

  const components: SystemComponent[] = SYSTEM_COMPONENTS.map(({ id, label }) => {
    let total = 0
    let failed = 0
    const bars = dates.map(date => {
      const d = days.get(`${id}|${date}`)
      total += d?.total ?? 0
      failed += d?.failed ?? 0
      return { date, state: barState(d?.total ?? 0, d?.failed ?? 0) }
    })
    const first = ms(latestBy.get(id)?.first)
    return {
      id,
      label,
      state: id === 'sync' ? syncComponentState(componentState(latestBy.get(id), now), syncFresh) : componentState(latestBy.get(id), now),
      bars,
      uptimePct: total > 0 ? Math.round(((total - failed) / total) * 1000) / 10 : null,
      since: first !== null ? new Date(first).toISOString() : null
    }
  })

  const firsts = components.map(c => ms(c.since)).filter((t): t is number => t !== null)

  return {
    overall: overallState(
      components.map(c => c.state),
      syncFresh,
      input.latest.length > 0
    ),
    components,
    sync: {
      lastRunAt: lastRun !== null ? new Date(lastRun).toISOString() : null,
      successRate24h: runs.length > 0 ? Math.round((runs.filter(r => r.ok).length / runs.length) * 1000) / 10 : null,
      avgDurationMs: runs.length > 0 ? Math.round(runs.reduce((sum, r) => sum + r.duration_ms, 0) / runs.length) : null
    },
    historySince: firsts.length > 0 ? new Date(Math.min(...firsts)).toISOString() : null,
    historyFull: firsts.length > 0 && Math.min(...firsts) <= now - (BAR_DAYS - 1) * DAY_MS
  }
}
