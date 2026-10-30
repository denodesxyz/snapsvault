import { randomUUID } from 'crypto'
import { acquireSyncLock, isSyncEnabled, releaseSyncLock } from '../database/sync-lock-service'

export class SnapshotSyncService {
  // The single enforcement point for the snapshot sync. The cron route (/api/sync-snapshots) is
  // the only entry point and must call this instead of calling
  // githubDataService.processAllSnapshotConfigurations() directly, so the enabled-check and the
  // concurrency lock always apply.
  async runSync(): Promise<{ success: boolean, message: string, details?: unknown, alreadyRunning?: boolean, disabled?: boolean }> {
    const enabled = await isSyncEnabled()
    if (!enabled) {
      return {
        success: false,
        message: 'Sync is disabled',
        disabled: true
      }
    }

    const runId = randomUUID()
    const acquired = await acquireSyncLock(runId)
    if (!acquired) {
      // Expected, non-exceptional outcome: another run is currently in progress (or holding a
      // not-yet-stale lock). Callers should surface this distinctly, not as a generic failure.
      return {
        success: false,
        message: 'Sync already in progress, skipped',
        alreadyRunning: true
      }
    }

    try {
      const { githubDataService } = await import('../github-data-service')

      const result = await githubDataService.processAllSnapshotConfigurations()
      console.log(`Sync completed: ${result.processedConfigurations} configurations processed, ${result.availableConfigurations} available, ${result.unavailableConfigurations} unavailable`)

      return {
        success: true,
        message: 'Sync completed successfully',
        details: {
          processed_configurations: result.processedConfigurations,
          available_configurations: result.availableConfigurations,
          unavailable_configurations: result.unavailableConfigurations,
          errors: result.errors
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        message: 'Sync failed',
        details: { error: errorMessage }
      }
    } finally {
      await releaseSyncLock(runId)
    }
  }
}

export const syncService = new SnapshotSyncService()
