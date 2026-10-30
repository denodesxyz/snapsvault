import { Snapshot, ISnapshot } from './models/snapshot'
import { connectToDatabase } from './connection'
import { SnapshotInfo } from '../github-data-service'
import { assertStorableHeight } from '../validation/feed'
import { currentSnapshotSet, outdatedFilter, snapshotIdentityKey, snapshotUpsertFilter, type ProtectedScope } from '../snapshot-identity'

const READ_MAX_TIME_MS = 5000
const HISTORICAL_DEFAULT_LIMIT = 100
const HISTORICAL_MAX_LIMIT = 500

function identityFields(s: SnapshotInfo) {
  return {
    chainName: s.chain.name,
    chainId: s.chain_id,
    blockHeight: s.block_height,
    type: s.type,
    contributorName: s.contributor.name,
    downloadUrl: s.url || ''
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class SnapshotDatabaseService {
  private async ensureConnection() {
    await connectToDatabase()
  }

  private convertSnapshotInfoToDbFormat(snapshot: SnapshotInfo, isCurrent: boolean): Partial<ISnapshot> {
    const size = typeof snapshot.size === 'number' ? `${snapshot.size}GB` : snapshot.size
    return {
      block_height: snapshot.block_height,
      time: new Date(snapshot.time),
      size: size,
      download_url: snapshot.url || '',
      
      chain: {
        name: snapshot.chain.name,
        display_name: snapshot.chain.name,
        image: snapshot.chain.image
      },
      network: snapshot.network,
      chain_id: snapshot.chain_id,
      type: snapshot.type,
      
      contributor: {
        name: snapshot.contributor.name,
        image: snapshot.contributor.image,
        logo_url: snapshot.contributor.logoUrl,
        website: snapshot.contributor.website,
        description: snapshot.contributor.description,
        email: snapshot.contributor.email,
        discord: snapshot.contributor.discord,
        telegram: snapshot.contributor.telegram,
        x: snapshot.contributor.x,
        identity: snapshot.contributor.identity
      },
      
      period: snapshot.period,
      tx_index: snapshot.tx_index,
      checksum: snapshot.checksum,
      compression: undefined,
      instructions: undefined,
      
      configuration_id: snapshot.configuration_id || 'unknown',

      first_seen: new Date(),
      last_seen: new Date(),
      is_current: isCurrent
    }
  }

  async bulkUpsertSnapshotInfos(snapshots: SnapshotInfo[]): Promise<{
    created: number
    updated: number
    failed: number
    errors: Array<{ snapshot: string, error: string }>
  }> {
    await this.ensureConnection()

    let created = 0
    let updated = 0
    let failed = 0
    const errors: Array<{ snapshot: string, error: string }> = []

    const currentSet = currentSnapshotSet(snapshots)

    for (const snapshot of snapshots) {
      const filter = snapshotUpsertFilter(identityFields(snapshot))

      // One bad entry must not abort the rest of this contributor's snapshot list - catch per
      // entry instead of letting a thrown error propagate out of the loop.
      try {
        assertStorableHeight(snapshot.type, snapshot.block_height)
        // findOneAndUpdate is atomic at the MongoDB level, so there is no read-then-write race;
        // this is defense in depth on top of the sync lock. first_seen is set only on insert;
        // every other field is set on every write.
        const fieldsToUpdate = this.convertSnapshotInfoToDbFormat(snapshot, currentSet.has(snapshot))
        const { first_seen, ...setFields } = fieldsToUpdate

        // new: false (default) returns the pre-update doc, or null if the upsert just created
        // one - that's how we tell created apart from updated without relying on any
        // mongoose-version-specific raw-result option.
        const preUpdateDoc = await Snapshot.findOneAndUpdate(
          filter,
          {
            $set: setFields,
            $setOnInsert: { first_seen: first_seen ?? new Date() }
          },
          { upsert: true }
        )

        if (preUpdateDoc) {
          updated++
        } else {
          created++
        }
      } catch (error) {
        failed++
        const label = `${snapshot.chain.name}/${snapshot.chain_id}:${snapshot.block_height}:${snapshot.type}:${snapshot.contributor.name}`
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to upsert snapshot ${label}:`, error)
        errors.push({ snapshot: label, error: message })
      }
    }

    return { created, updated, failed, errors }
  }
  /**
   * Mark previously-current snapshots as outdated when this run has positive evidence they're
   * superseded - i.e. they belong to a chain that was actually (re-)checked this run but didn't
   * appear in `currentSnapshots`. `discoveredChainNames`, when provided, scopes the sweep to only
   * those chains (matching the `chain.name` display form, e.g. "Celestia"): a chain that failed
   * discovery this run contributes nothing to `currentSnapshots` but is NOT in
   * `discoveredChainNames` either, so its existing is_current docs are left untouched rather than
   * being wrongly flipped to outdated just because we failed to check them this run.
   * `protectedScopes` narrows that further: a scope whose registry read or feed fetch failed keeps
   * its current snapshots current. Of the snapshots without a height, only the newest per contributor
   * and type counts as current; the others are marked not current but never deleted.
   */
  async markOutdatedSnapshotInfos(
    currentSnapshots: SnapshotInfo[],
    discoveredChainNames?: string[],
    protectedScopes: ProtectedScope[] = []
  ): Promise<number> {
    await this.ensureConnection()

    const keepKeys = Array.from(currentSnapshotSet(currentSnapshots)).map(s => snapshotIdentityKey(identityFields(s)))
    const filter = outdatedFilter(keepKeys, discoveredChainNames, protectedScopes)

    const outdatedSnapshots = await Snapshot.find(filter)

    const updateResult = await Snapshot.updateMany(
      {
        _id: { $in: outdatedSnapshots.map(s => s._id) }
      },
      {
        is_current: false,
        last_seen: new Date()
      }
    )

    return updateResult.modifiedCount
  }
  async getCurrentSnapshots(): Promise<ISnapshot[]> {
    await this.ensureConnection()
    
    const allSnapshots = await Snapshot.find({ 
      is_current: true,
      last_seen: { $exists: true, $ne: null }
    })
      .sort({ time: -1 })
      .maxTimeMS(READ_MAX_TIME_MS)
      .exec()
    
    return allSnapshots
  }

  async getSnapshotsByChain(chainName: string): Promise<ISnapshot[]> {
    await this.ensureConnection()
    
    const allSnapshots = await Snapshot.find({ 
      'chain.name': { $regex: new RegExp(`^${escapeRegExp(chainName)}$`, 'i') },
      is_current: true,
      last_seen: { $exists: true, $ne: null }
    })
      .sort({ time: -1 })
      .maxTimeMS(READ_MAX_TIME_MS)
      .exec()
    
    return allSnapshots
  }

  async getHistoricalSnapshots(
    chainName: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = HISTORICAL_DEFAULT_LIMIT
  ): Promise<ISnapshot[]> {
    await this.ensureConnection()

    const filter: Record<string, unknown> = {
      'chain.name': { $regex: new RegExp(`^${escapeRegExp(chainName)}$`, 'i') }
    }

    if (startDate || endDate) {
      const timeFilter: Record<string, Date> = {}
      if (startDate) timeFilter.$gte = startDate
      if (endDate) timeFilter.$lte = endDate
      filter.time = timeFilter
    }

    const cappedLimit = Math.min(Math.max(1, limit), HISTORICAL_MAX_LIMIT)

    return await Snapshot.find(filter)
      .sort({ time: -1, block_height: -1 })
      .limit(cappedLimit)
      .maxTimeMS(READ_MAX_TIME_MS)
      .exec()
  }

  // Time of the newest stored snapshot for each of the given download URLs, in milliseconds.
  async getNewestTimeByUrl(urls: string[]): Promise<Map<string, number>> {
    await this.ensureConnection()
    if (urls.length === 0) return new Map()

    const rows = await Snapshot.aggregate<{ _id: string; newest: Date }>([
      { $match: { download_url: { $in: urls } } },
      { $group: { _id: '$download_url', newest: { $max: '$time' } } }
    ]).option({ maxTimeMS: READ_MAX_TIME_MS })
    return new Map(rows.map(row => [row._id, new Date(row.newest).getTime()]))
  }
}

export const snapshotDbService = new SnapshotDatabaseService()
