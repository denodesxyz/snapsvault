import { connectToDatabase } from './connection'
import { SyncRun } from './models/sync-run'
import { Snapshot } from './models/snapshot'
import { SnapshotConfiguration } from './models/snapshot-configuration'

const QUERY_MAX_TIME_MS = 1500
// The whole log write never holds the cron response longer than this.
const TOTAL_BUDGET_MS = 2000

export interface SyncRunCounts {
  feeds_total: number
  feeds_ok: number
  feeds_failed: number
}

async function write(startedAt: Date, ok: boolean, known: SyncRunCounts | undefined): Promise<void> {
  await connectToDatabase()
  const finishedAt = new Date()
  let counts = known
  if (!counts) {
    const [total, failed] = await Promise.all([
      SnapshotConfiguration.countDocuments({}).maxTimeMS(QUERY_MAX_TIME_MS),
      SnapshotConfiguration.countDocuments({ consecutiveFailures: { $gt: 0 } }).maxTimeMS(QUERY_MAX_TIME_MS)
    ])
    counts = { feeds_total: total, feeds_ok: total - failed, feeds_failed: failed }
  }
  const snapshotsCurrent = await Snapshot.countDocuments({ is_current: true }).maxTimeMS(QUERY_MAX_TIME_MS)
  await SyncRun.create({
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    ok,
    ...counts,
    snapshots_current: snapshotsCurrent
  })
}

// One document per sync run. Never throws and never waits past the budget: a slow or
// failed write must not affect the sync or its response. Without known counts they are
// computed from the stored configurations (consecutiveFailures > 0 means failed).
export async function recordSyncRun(startedAt: Date, ok: boolean, counts?: SyncRunCounts): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const budget = new Promise<void>(resolve => {
      timer = setTimeout(resolve, TOTAL_BUDGET_MS)
    })
    await Promise.race([write(startedAt, ok, counts), budget])
  } catch (error) {
    console.error('Sync run log write failed:', error instanceof Error ? error.name : 'UnknownError')
  } finally {
    clearTimeout(timer)
  }
}
