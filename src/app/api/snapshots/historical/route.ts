import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { snapshotDbService } from '@/lib/database/snapshot-service'

import { ISnapshot } from '@/lib/database/models/snapshot'
import { parseNetworkParam, validateHttpsUrl } from '@/lib/validation/feed'
import { absoluteUrl, toPublicChainFields, toPublicChecksum } from '@/lib/public-names'
import { isUrlReused } from '@/lib/history-availability'

// Returns undefined for an absent param, a parsed Date for a valid one, or null for
// a value that doesn't parse to a real date (e.g. "garbage") - callers reject on null
// instead of letting it reach Mongoose, which would otherwise cast it to null and match
// almost every document.
function parseDateParam(raw: string | null): Date | undefined | null {
  if (!raw) return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const networkParam = parseNetworkParam(searchParams.get('network'))
    if (!networkParam.ok) {
      return NextResponse.json({ success: false, error: 'Invalid network parameter' }, { status: 400 })
    }
    const network = networkParam.value
    const startDate = parseDateParam(searchParams.get('startDate'))
    if (startDate === null) {
      return NextResponse.json({ success: false, error: 'Invalid startDate parameter' }, { status: 400 })
    }
    const endDate = parseDateParam(searchParams.get('endDate'))
    if (endDate === null) {
      return NextResponse.json({ success: false, error: 'Invalid endDate parameter' }, { status: 400 })
    }
    const currentOnly = searchParams.get('currentOnly') === 'true'

    let snapshots: ISnapshot[]

    if (currentOnly) {
      if (network) {
        snapshots = await snapshotDbService.getSnapshotsByChain(network)
      } else {
        snapshots = await snapshotDbService.getCurrentSnapshots()
      }
    } else {
      if (network) {
        snapshots = await snapshotDbService.getHistoricalSnapshots(network, startDate, endDate)
      } else {
        snapshots = await snapshotDbService.getCurrentSnapshots()
      }
    }

    const storedCount = snapshots.length
    snapshots = snapshots.filter(snapshot => validateHttpsUrl(snapshot.download_url).ok)
    if (snapshots.length < storedCount) {
      console.warn(`Historical snapshots API: dropped ${storedCount - snapshots.length} stored snapshot(s) with an unsafe download_url`)
    }

    // Only snapshots that left the current set can have been superseded.
    const pastUrls = [...new Set(snapshots.filter(snapshot => !snapshot.is_current).map(snapshot => snapshot.download_url))]
    const newestTimeByUrl = pastUrls.length > 0 ? await snapshotDbService.getNewestTimeByUrl(pastUrls) : new Map<string, number>()

    return NextResponse.json({
      success: true,
      data: snapshots.map(snapshot => transformDbSnapshotToApiFormat(snapshot, !isUrlReused(snapshot, newestTimeByUrl))),
      count: snapshots.length
    }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
  } catch (error) {
    console.error('Error fetching historical snapshots:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch historical snapshots' 
      },
      { status: 500 }
    )
  }
}

function transformDbSnapshotToApiFormat(snapshot: ISnapshot, isAvailable: boolean) {
  const contributor = snapshot.contributor || {}

  return {
    block_height: snapshot.block_height,
    time: snapshot.time,
    size: snapshot.size,
    url: snapshot.download_url,
    type: snapshot.type,
    ...toPublicChainFields(snapshot),
    contributor: {
      name: contributor.name,
      image: absoluteUrl(contributor.image),
      logo_url: contributor.logo_url || null,
      website: contributor.website || null,
      description: contributor.description || null,
      email: contributor.email || null,
      discord: contributor.discord || null,
      telegram: contributor.telegram || null,
      x: contributor.x || null,
      identity: contributor.identity || null
    },
    period: snapshot.period,
    tx_index: snapshot.tx_index,
    checksum: toPublicChecksum(snapshot.checksum),
    compression: snapshot.compression,
    instructions: snapshot.instructions,
    is_available: isAvailable
  }
}
