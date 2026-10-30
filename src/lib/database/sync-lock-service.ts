import { SyncLock } from './models/sync-lock'
import { connectToDatabase } from './connection'

const SYNC_LOCK_ID = 'snapshot-sync'

// How long a lock is honored before it's considered abandoned (crashed/killed run) and can be
// stolen by the next attempt.
//
// Worst-case run duration, from the actual pipeline (src/lib/github-data-service.ts):
// - Discovery is a sequence of GitHub API / feed HTTP calls (chains -> chain_ids -> contributor
//   files -> snapshot feeds), each capped at FEED_TIMEOUT_MS = 10s (src/lib/validation/feed.ts).
//   A broad, sustained GitHub/feed outage hitting most calls could in theory push this to many
//   minutes, but that requires degraded conditions across most of the registry at once, not a
//   single slow chain (which is isolated - see the per-chain try/catch in
//   getAllSnapshotConfigurations).
// - The write phase batches 10 configurations at a time with a 100ms pause between batches;
//   under normal conditions this is fast relative to discovery.
// Under normal conditions a full run finishes in well under this TTL. 10 minutes gives a real
// in-flight run a wide safety margin while still self-healing a genuinely crashed/killed run
// within a handful of missed cron ticks (cron runs every 2 minutes per vercel.json) instead of
// deadlocking forever.
const LOCK_TTL_MS = 10 * 60 * 1000

/**
 * Attempt to acquire the single snapshot-sync lock. Returns true if this call won the lock.
 *
 * Uses an atomic findOneAndUpdate so the acquisition itself can't race: the filter only matches
 * a free or stale lock, and upsert creates the document on first use. Because another concurrent
 * acquire attempt could have won the same race microseconds earlier (and set a different
 * lockedBy), we don't trust `new: true` returning a document on its own - we confirm the
 * returned doc's lockedBy actually matches the runId we just tried to set.
 */
export async function acquireSyncLock(runId: string): Promise<boolean> {
  await connectToDatabase()

  const staleCutoff = new Date(Date.now() - LOCK_TTL_MS)

  try {
    const result = await SyncLock.findOneAndUpdate(
      {
        _id: SYNC_LOCK_ID,
        $or: [{ lockedAt: null }, { lockedAt: { $lt: staleCutoff } }]
      },
      { $set: { lockedAt: new Date(), lockedBy: runId } },
      { upsert: true, new: true }
    )

    return result?.lockedBy === runId
  } catch (error) {
    // Once the lock document exists, a currently-held non-stale lock doesn't match this
    // query's $or clause, so MongoDB finds nothing to update and falls back to its upsert
    // insert path - which collides with the existing _id and throws E11000, instead of just
    // matching zero documents. That collision IS the "someone else holds the lock" case, not
    // a real error - treat it the same as losing the atomic race.
    const code = (error as { code?: number } | null)?.code
    if (code === 11000) {
      return false
    }
    throw error
  }
}

/** Release the lock, but only if we still hold it (don't clobber a later run's lock). */
export async function releaseSyncLock(runId: string): Promise<void> {
  await connectToDatabase()

  await SyncLock.updateOne(
    { _id: SYNC_LOCK_ID, lockedBy: runId },
    { $set: { lockedAt: null, lockedBy: null } }
  )
}

/** DB-backed replacement for the old in-memory `config.enabled`, shared across all instances. */
export async function isSyncEnabled(): Promise<boolean> {
  await connectToDatabase()

  const doc = await SyncLock.findOne({ _id: SYNC_LOCK_ID }).lean<{ enabled?: boolean }>()
  // Default to enabled when the document doesn't exist yet or `enabled` was never set.
  return doc?.enabled !== false
}
