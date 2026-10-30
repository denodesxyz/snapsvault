import { unstable_cache } from 'next/cache'
import { connectToDatabase } from '@/lib/database/connection'
import { SnapshotConfiguration } from '@/lib/database/models/snapshot-configuration'
import { Snapshot } from '@/lib/database/models/snapshot'
import { SyncRun } from '@/lib/database/models/sync-run'
import { UptimeCheck } from '@/lib/database/models/uptime-check'
import { parseSizeToBytes } from '@/lib/snapshot-utils'
import { validateHttpsUrl } from '@/lib/validation/feed'
import { settle } from '@/lib/settle'
import { buildStatus, DAILY_NEW_DAYS, HEIGHT_RULE_MATCH, STATUS_CACHE_TAG, type StatusData } from '@/lib/status-model'
import { BAR_DAYS, buildSystem, SYSTEM_COMPONENTS, type SystemInput } from '@/lib/status-system'

const READ_MAX_TIME_MS = 5000
const DAY_MS = 24 * 60 * 60 * 1000
// Newest snapshot times kept per feed for the interval and timeline.
const HISTORY_TIMES_PER_FEED = 600

interface ConfigDoc {
  contributorName: string
  chainName: string
  chain_id: string
  type?: string
  period?: string
  consecutiveFailures?: number
  lastSuccessfulFetch?: Date | null
  lastFailedFetch?: Date | null
  uptimeChecks?: { totalChecks?: number; successfulChecks?: number }
}

interface SnapshotDoc {
  chain: { name: string }
  chain_id: string
  type: string
  time: Date
  size: string
  download_url: string
  contributor: { name: string }
}

interface HistoryDoc {
  _id: { chain: string; chain_id: string; type: string; contributor: string }
  count: number
  times: Date[]
  newest: { height: number; size: string }
}

type RunDoc = { finished_at: Date; duration_ms: number; ok: boolean }
type LatestCheck = { component: string; at: Date; ok: boolean; first: Date }

// A bare number is gigabytes; digit strings of a megabyte or more are raw bytes (contract size rule).
function sizeBytes(size: string): number {
  const trimmed = (size ?? '').trim()
  if (/^\d+(\.\d+)?$/.test(trimmed) && Number(trimmed) < 1e6) return parseSizeToBytes(Number(trimmed))
  return parseSizeToBytes(trimmed)
}

const utcMidnight = (now: number) => Date.parse(new Date(now).toISOString().slice(0, 10))

// Newest and oldest stored check of one component, each served by the {component, at} index.
async function latestCheck(component: string): Promise<LatestCheck | null> {
  const [newest, oldest] = await Promise.all([
    UptimeCheck.findOne({ component }).sort({ at: -1 }).select('at ok').maxTimeMS(READ_MAX_TIME_MS).lean<{ at: Date; ok: boolean } | null>(),
    UptimeCheck.findOne({ component }).sort({ at: 1 }).select('at').maxTimeMS(READ_MAX_TIME_MS).lean<{ at: Date } | null>()
  ])
  return newest && oldest ? { component, at: newest.at, ok: newest.ok, first: oldest.at } : null
}

async function readHistory() {
  // Fields are trimmed before grouping and the groups keep only the newest entries, so
  // neither the pipeline nor its result grows with the whole history.
  const [histories, allTimeRows, newestRows] = await Promise.all([
    Snapshot.aggregate<HistoryDoc>([
      { $match: HEIGHT_RULE_MATCH },
      { $project: { 'chain.name': 1, chain_id: 1, type: 1, 'contributor.name': 1, time: 1, block_height: 1, size: 1 } },
      {
        $group: {
          _id: { chain: '$chain.name', chain_id: '$chain_id', type: '$type', contributor: '$contributor.name' },
          count: { $sum: 1 },
          times: { $topN: { n: HISTORY_TIMES_PER_FEED, sortBy: { time: -1 }, output: '$time' } },
          newest: { $top: { sortBy: { time: -1 }, output: { height: '$block_height', size: '$size' } } }
        }
      }
    ]).option({ maxTimeMS: READ_MAX_TIME_MS }),
    Snapshot.aggregate<{ count: number; earliest: Date | null }>([
      { $match: HEIGHT_RULE_MATCH },
      { $group: { _id: null, count: { $sum: 1 }, earliest: { $min: '$first_seen' } } }
    ]).option({ maxTimeMS: READ_MAX_TIME_MS }),
    // The time index serves the sort.
    Snapshot.find(HEIGHT_RULE_MATCH)
      .sort({ time: -1 })
      .limit(1)
      .select('contributor.name chain_id time')
      .maxTimeMS(READ_MAX_TIME_MS)
      .lean<Array<{ contributor: { name: string }; chain_id: string; time: Date }>>()
  ])
  return { histories, allTimeRows, newestRows }
}

async function readDaily(now: number) {
  const from = new Date(utcMidnight(now) - (DAILY_NEW_DAYS - 1) * DAY_MS)
  return Snapshot.aggregate<{ _id: { day: string; contributor: string }; count: number }>([
    { $match: { time: { $gte: from }, ...HEIGHT_RULE_MATCH } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$time', timezone: 'UTC' } }, contributor: '$contributor.name' },
        count: { $sum: 1 }
      }
    }
  ]).option({ maxTimeMS: READ_MAX_TIME_MS })
}

async function readSystem(now: number) {
  const from = new Date(utcMidnight(now) - (BAR_DAYS - 1) * DAY_MS)
  const [days, latest, runs24h, lastRun, lastOkRun] = await Promise.all([
    UptimeCheck.aggregate<{ _id: { component: string; day: string }; total: number; failed: number }>([
      { $match: { at: { $gte: from } } },
      {
        $group: {
          _id: { component: '$component', day: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: 'UTC' } } },
          total: { $sum: 1 },
          failed: { $sum: { $cond: ['$ok', 0, 1] } }
        }
      }
    ]).option({ maxTimeMS: READ_MAX_TIME_MS }),
    Promise.all(SYSTEM_COMPONENTS.map(c => latestCheck(c.id))),
    SyncRun.find({ started_at: { $gte: new Date(now - DAY_MS) } })
      .select('finished_at duration_ms ok')
      .limit(1000)
      .maxTimeMS(READ_MAX_TIME_MS)
      .lean<RunDoc[]>(),
    SyncRun.findOne({}).sort({ started_at: -1 }).select('finished_at').maxTimeMS(READ_MAX_TIME_MS).lean<{ finished_at: Date } | null>(),
    SyncRun.findOne({ ok: true }).sort({ started_at: -1 }).select('finished_at').maxTimeMS(READ_MAX_TIME_MS).lean<{ finished_at: Date } | null>()
  ])
  return buildSystemInput(days, latest, runs24h, lastRun, lastOkRun)
}

function buildSystemInput(
  days: Array<{ _id: { component: string; day: string }; total: number; failed: number }>,
  latest: Array<LatestCheck | null>,
  runs24h: RunDoc[],
  lastRun: { finished_at: Date } | null,
  lastOkRun: { finished_at: Date } | null
): SystemInput {
  return {
    days: days.map(d => ({ component: d._id.component, day: d._id.day, total: d.total, failed: d.failed })),
    latest: latest.filter((l): l is LatestCheck => l !== null),
    runs24h,
    lastRunAt: lastRun?.finished_at ?? null,
    lastOkRunAt: lastOkRun?.finished_at ?? null
  }
}

async function readStatus(): Promise<StatusData> {
  await connectToDatabase()

  const now = Date.now()

  // Core: the feed rows. A failure here fails the page, as before.
  const [configurations, snapshots] = await Promise.all([
    SnapshotConfiguration.find({})
      .select('contributorName chainName chain_id type period consecutiveFailures lastSuccessfulFetch lastFailedFetch uptimeChecks')
      .maxTimeMS(READ_MAX_TIME_MS)
      .lean<ConfigDoc[]>(),
    // Same set the marketplace lists: current, synced, with a safe download URL.
    Snapshot.find({ is_current: true, last_seen: { $exists: true, $ne: null } })
      .select('chain.name chain_id type time size download_url contributor.name')
      .maxTimeMS(READ_MAX_TIME_MS)
      .lean<SnapshotDoc[]>()
  ])

  // Extras: each one fails alone and shows its own empty state.
  const [history, daily, systemInput] = await Promise.all([
    settle(readHistory(), null),
    settle(readDaily(now), null),
    settle(readSystem(now), null)
  ])

  const base = buildStatus(
    configurations.map(c => ({
      contributorName: c.contributorName,
      chainName: c.chainName,
      chain_id: c.chain_id,
      type: c.type ?? '',
      period: c.period ?? '',
      consecutiveFailures: c.consecutiveFailures ?? 0,
      lastSuccessfulFetch: c.lastSuccessfulFetch ?? null,
      lastFailedFetch: c.lastFailedFetch ?? null,
      uptimeTotalChecks: c.uptimeChecks?.totalChecks ?? 0,
      uptimeSuccessfulChecks: c.uptimeChecks?.successfulChecks ?? 0
    })),
    snapshots
      .filter(s => validateHttpsUrl(s.download_url).ok)
      .map(s => ({
        contributorName: s.contributor.name,
        chainName: s.chain.name,
        chain_id: s.chain_id,
        type: s.type,
        time: s.time,
        sizeBytes: sizeBytes(s.size)
      })),
    now,
    {
      histories: history.value?.histories.map(h => ({
        contributorName: h._id.contributor,
        chainName: h._id.chain,
        chain_id: h._id.chain_id,
        type: h._id.type,
        count: h.count,
        times: h.times,
        newestHeight: h.newest?.height ?? 0,
        newestSize: h.newest?.size ?? ''
      })),
      allTime: history.value
        ? {
            count: history.value.allTimeRows[0]?.count ?? 0,
            newest: history.value.newestRows[0]
              ? { contributorName: history.value.newestRows[0].contributor.name, chain_id: history.value.newestRows[0].chain_id, time: history.value.newestRows[0].time }
              : null,
            earliestFirstSeen: history.value.allTimeRows[0]?.earliest ?? null
          }
        : undefined,
      dailyRows: daily.value?.map(r => ({ day: r._id.day, contributor: r._id.contributor, count: r.count }))
    }
  )

  const system = buildSystem(
    systemInput.value ?? { days: [], latest: [], runs24h: [], lastRunAt: null, lastOkRunAt: null },
    base.lastSyncAt,
    now
  )

  return { ...base, system, partial: { history: history.failed, daily: daily.failed, system: systemInput.failed } }
}

// One database read per minute at most, shared by every visitor. Every recorded sync run expires
// the tag, so the first view after a run reads fresh data instead of an old cached page.
export const getStatus = unstable_cache(readStatus, ['public-status'], { revalidate: 60, tags: [STATUS_CACHE_TAG] })
