import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { syncService } from '@/lib/sync/run-sync'
import { isAuthorized } from '@/lib/auth/verify-secret'
import { recordSyncRun } from '@/lib/database/sync-run-service'
import { STATUS_CACHE_TAG } from '@/lib/status-model'

// Only a completed run reports counts; for a failed run they come from the stored configurations.
function syncCounts(details: unknown) {
  const d = (details ?? {}) as Record<string, unknown>
  if (typeof d.processed_configurations !== 'number') return undefined
  const num = (value: unknown) => (typeof value === 'number' ? value : 0)
  return {
    feeds_total: num(d.processed_configurations),
    feeds_ok: num(d.available_configurations),
    feeds_failed: num(d.unavailable_configurations)
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request, 'CRON_SECRET')) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 })
  }

  const startedAt = new Date()
  let recorded = false

  try {
    const result = await syncService.runSync()

    if (result.alreadyRunning) {
      // Expected outcome, not a failure: a previous run is still in progress. Don't surface
      // this as a 500 - it would just be cron noise every time two ticks overlap.
      console.log('Scheduled sync skipped: previous run still in progress')
      return NextResponse.json({
        success: true,
        skipped: true,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    }

    if (!result.disabled) {
      recorded = true
      await recordSyncRun(startedAt, result.success, syncCounts(result.details))
      revalidateTag(STATUS_CACHE_TAG)
    }

    if (!result.success) {
      console.error('Sync failed:', result)
      return NextResponse.json({
        success: false,
        error: result.message || 'Sync failed',
        details: result.details,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    revalidatePath('/api/snapshots')
    revalidatePath('/api/networks')

    return NextResponse.json({
      success: true,
      message: 'Scheduled sync completed',
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error) {
    console.error('Scheduled sync failed:', error)
    if (!recorded) {
      await recordSyncRun(startedAt, false)
      revalidateTag(STATUS_CACHE_TAG)
    }
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
