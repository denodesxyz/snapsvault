// Pure model behind the public /status page: turns stored configurations and
// current snapshots into one row per contributor, chain ID and type, plus
// all-time totals, per-day counts and the system section. Only derived values
// leave this module, never error text, ids or URLs.

import type { SystemData } from './status-system'

// Cache tag of the status read; the sync route expires it after every recorded run.
export const STATUS_CACHE_TAG = 'public-status'

export type FeedStatus = 'ok' | 'stale' | 'failing'

export interface StatusConfigInput {
  contributorName: string
  chainName: string
  chain_id: string
  type: string
  period: string
  consecutiveFailures: number
  lastSuccessfulFetch: Date | string | null | undefined
  lastFailedFetch: Date | string | null | undefined
  uptimeTotalChecks?: number
  uptimeSuccessfulChecks?: number
}

export interface StatusSnapshotInput {
  contributorName: string
  chainName: string
  chain_id: string
  type: string
  time: Date | string
  sizeBytes?: number
}

// One feed's whole history (current and past snapshots), newest first.
export interface FeedHistoryInput {
  contributorName: string
  chainName: string
  chain_id: string
  type: string
  count: number
  times: Array<Date | string>
  newestHeight: number
  newestSize: string
}

export interface AllTimeInput {
  count: number
  newest: { contributorName: string; chain_id: string; time: Date | string } | null
  earliestFirstSeen: Date | string | null
}

export interface DailyNewInput {
  day: string // UTC day, YYYY-MM-DD
  contributor: string
  count: number
}

export interface StatusExtraInput {
  histories?: FeedHistoryInput[]
  allTime?: AllTimeInput
  dailyRows?: DailyNewInput[]
}

export interface StatusRow {
  contributor: string
  chain_id: string
  type: string
  status: FeedStatus
  reason: string | null
  newestSnapshotAt: string | null
  snapshotCount: number
  period: string
  actualIntervalHours: number | null
  snapshotsAllTime: number
  uptimePct: number | null
  newestHeight: number | null
  newestSize: string | null
  timeline: string[]
}

export interface StatusTotals {
  snapshotsAllTime: number
  snapshotsCurrent: number
  contributors: number
  feeds: number
  chainIds: number
  dataAvailableBytes: number
  newestSnapshot: { contributor: string; chain_id: string; time: string } | null
  historySince: string | null
}

export interface DailyNewDay {
  date: string
  total: number
  counts: Record<string, number>
}

export interface DailyNew {
  days: DailyNewDay[]
  contributors: string[]
}

export interface StatusData {
  lastSyncAt: string | null
  totalSnapshots: number
  rows: StatusRow[]
  totals: StatusTotals
  dailyNew: DailyNew
  system: SystemData
  // Optional reads that failed; the core feed rows never depend on them.
  partial: { history: boolean; daily: boolean; system: boolean }
}

// The system section comes from uptime checks and sync runs, so it is attached by status.ts.
export type StatusBase = Omit<StatusData, 'system' | 'partial'>

const HOUR_MS = 60 * 60 * 1000
// A configuration the last sync no longer touched has left the registry.
const REGISTRY_GRACE_MS = HOUR_MS

const PERIOD = /^(\d{1,4})\s*(h|d|w)$/i

// "4h", "24h", "1d", "1w" in milliseconds; null for anything else.
export function periodMs(period: string): number | null {
  const m = PERIOD.exec(period.trim())
  if (!m) return null
  const n = Number(m[1])
  if (n <= 0) return null
  const unit = m[2].toLowerCase()
  return n * (unit === 'h' ? HOUR_MS : unit === 'd' ? 24 * HOUR_MS : 7 * 24 * HOUR_MS)
}

// Twice the declared period; null without a declared period, which is never stale.
export function staleAfterMs(period: string): number | null {
  const declared = periodMs(period)
  return declared === null ? null : 2 * declared
}

function ms(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

// Empty or missing types on either side count as 'unknown', so both sides still match.
function normalizeType(type: string | null | undefined): string {
  return typeof type === 'string' && type.trim() !== '' ? type.trim() : 'unknown'
}

const DAY_MS = 24 * HOUR_MS
const TIMELINE_DAYS = 30
const TIMELINE_CAP = 400
export const DAILY_NEW_DAYS = 90

function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

// Records the sync would not list: height 0 is only allowed for type "archive" (exact match).
// status.ts applies the same rule as a database filter (HEIGHT_RULE_MATCH).
export function passesHeightRule(type: string, blockHeight: number): boolean {
  return type === 'archive' || blockHeight > 0
}

export const HEIGHT_RULE_MATCH = { $or: [{ type: 'archive' }, { block_height: { $gt: 0 } }] }

// Keeps at most `cap` items spread evenly over the whole list, so a dense feed shows no fake gap.
export function thin<T>(items: T[], cap: number): T[] {
  if (items.length <= cap) return items
  return Array.from({ length: cap }, (_, i) => items[Math.round((i * (items.length - 1)) / (cap - 1))])
}

// Median gap in hours between consecutive distinct snapshot times (the mean of the two middle
// gaps for an even count); null with fewer than two distinct times.
export function medianIntervalHours(times: Array<Date | string>): number | null {
  const sorted = [...new Set(times.map(t => ms(t)).filter((t): t is number => t !== null))].sort((a, b) => a - b)
  if (sorted.length < 2) return null
  const gaps = sorted.slice(1).map((t, i) => t - sorted[i]).sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  const median = gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
  return Math.round((median / HOUR_MS) * 10) / 10
}

// Snapshots per UTC day and contributor for the last `days` days, oldest first, empty days included.
export function buildDailyNew(rows: DailyNewInput[], now: number, days: number = DAILY_NEW_DAYS): DailyNew {
  const today = Date.parse(utcDay(now))
  const dates = Array.from({ length: days }, (_, i) => utcDay(today - (days - 1 - i) * DAY_MS))
  const byDate = new Map<string, DailyNewDay>(dates.map(date => [date, { date, total: 0, counts: {} }]))
  const totals = new Map<string, number>()
  for (const r of rows) {
    const day = byDate.get(r.day)
    if (!day || r.count <= 0) continue
    day.counts[r.contributor] = (day.counts[r.contributor] ?? 0) + r.count
    day.total += r.count
    totals.set(r.contributor, (totals.get(r.contributor) ?? 0) + r.count)
  }
  const contributors = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }))
    .map(([name]) => name)
  return { days: dates.map(date => byDate.get(date)!), contributors }
}

function key(contributor: string, chainName: string, chainId: string, type: string): string {
  return [contributor, chainName.toLowerCase(), chainId, type].join('\u0000')
}

export function buildStatus(
  configurations: StatusConfigInput[],
  snapshots: StatusSnapshotInput[],
  now: number = Date.now(),
  extra: StatusExtraInput = {}
): StatusBase {
  const lastCheck = (c: StatusConfigInput) => Math.max(ms(c.lastSuccessfulFetch) ?? 0, ms(c.lastFailedFetch) ?? 0)

  const lastSync = configurations.reduce((max, c) => Math.max(max, ms(c.lastSuccessfulFetch) ?? 0), 0)
  const newestCheck = configurations.reduce((max, c) => Math.max(max, lastCheck(c)), 0)
  const listed = configurations.filter(c => lastCheck(c) > 0 && lastCheck(c) >= newestCheck - REGISTRY_GRACE_MS)

  const perConfig = new Map<string, { count: number; newest: number }>()
  for (const s of snapshots) {
    const k = key(s.contributorName, s.chainName, s.chain_id, normalizeType(s.type))
    const entry = perConfig.get(k) ?? { count: 0, newest: 0 }
    entry.count++
    entry.newest = Math.max(entry.newest, ms(s.time) ?? 0)
    perConfig.set(k, entry)
  }

  const histories = new Map<string, FeedHistoryInput>()
  for (const h of extra.histories ?? []) {
    const k = key(h.contributorName, h.chainName, h.chain_id, normalizeType(h.type))
    const prior = histories.get(k)
    if (!prior) {
      histories.set(k, h)
      continue
    }
    // Two stored groups can map to one feed (type spelling, chain name casing): merge them.
    const newestIsPrior = (ms(prior.times[0]) ?? 0) >= (ms(h.times[0]) ?? 0)
    const newer = newestIsPrior ? prior : h
    histories.set(k, {
      ...newer,
      count: prior.count + h.count,
      times: [...prior.times, ...h.times].sort((a, b) => (ms(b) ?? 0) - (ms(a) ?? 0))
    })
  }
  const timelineFrom = now - TIMELINE_DAYS * DAY_MS

  const rows: StatusRow[] = listed.map(c => {
    const type = normalizeType(c.type)
    const found = perConfig.get(key(c.contributorName, c.chainName, c.chain_id, type))
    const newest = found && found.newest > 0 ? found.newest : null
    const staleAfter = staleAfterMs(c.period ?? '')
    let status: FeedStatus = 'ok'
    let reason: string | null = null
    if (c.consecutiveFailures > 0) {
      status = 'failing'
      reason = 'Feed unreachable or no valid entries'
    } else if (!found) {
      status = 'failing'
      reason = 'No current snapshots'
    } else if (staleAfter !== null && (newest === null || now - newest > staleAfter)) {
      status = 'stale'
      reason = 'No new snapshot in the expected period'
    }
    const history = histories.get(key(c.contributorName, c.chainName, c.chain_id, type))
    const checks = c.uptimeTotalChecks ?? 0
    const inWindow = (history?.times ?? [])
      .map(t => ms(t))
      .filter((t): t is number => t !== null && t >= timelineFrom)
      .sort((a, b) => a - b)
    const timeline = thin(inWindow, TIMELINE_CAP).map(t => new Date(t).toISOString())
    return {
      contributor: c.contributorName,
      chain_id: c.chain_id,
      type,
      status,
      reason,
      newestSnapshotAt: newest !== null ? new Date(newest).toISOString() : null,
      snapshotCount: found?.count ?? 0,
      period: (c.period ?? '').trim(),
      actualIntervalHours: history ? medianIntervalHours(history.times) : null,
      snapshotsAllTime: history?.count ?? 0,
      uptimePct: checks > 0 ? Math.round(((c.uptimeSuccessfulChecks ?? 0) / checks) * 1000) / 10 : null,
      newestHeight: history ? history.newestHeight : null,
      newestSize: history?.newestSize ? history.newestSize : null,
      timeline
    }
  })

  rows.sort((a, b) =>
    a.chain_id.localeCompare(b.chain_id) ||
    a.contributor.localeCompare(b.contributor, 'en', { sensitivity: 'base' }) ||
    a.type.localeCompare(b.type)
  )

  const lastSyncAt = lastSync > 0 ? new Date(lastSync).toISOString() : null
  const allTime = extra.allTime
  const newestOverall = allTime?.newest ?? null
  const historySince = ms(allTime?.earliestFirstSeen)

  return {
    lastSyncAt,
    totalSnapshots: snapshots.length,
    rows,
    totals: {
      snapshotsAllTime: allTime?.count ?? 0,
      snapshotsCurrent: snapshots.length,
      contributors: new Set(rows.map(r => r.contributor)).size,
      feeds: rows.length,
      chainIds: new Set(rows.map(r => r.chain_id)).size,
      dataAvailableBytes: snapshots.reduce((sum, s) => sum + (s.sizeBytes ?? 0), 0),
      newestSnapshot: newestOverall && ms(newestOverall.time) !== null
        ? { contributor: newestOverall.contributorName, chain_id: newestOverall.chain_id, time: new Date(newestOverall.time).toISOString() }
        : null,
      historySince: historySince !== null ? new Date(historySince).toISOString() : null
    },
    dailyNew: buildDailyNew(extra.dailyRows ?? [], now)
  }
}
