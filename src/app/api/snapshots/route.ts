import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { parseNetworkParam } from '@/lib/validation/feed'
import { readChainQuery } from '@/lib/public-names'
import { getSnapshotsPayload } from '@/lib/snapshots-payload'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = readChainQuery(searchParams)
    const networkParam = parseNetworkParam(query.network)
    if (!networkParam.ok) {
      return NextResponse.json({ success: false, error: 'Invalid network parameter' }, { status: 400 })
    }

    const payload = await getSnapshotsPayload({
      network: networkParam.value,
      chain: query.chain
    })
    return NextResponse.json({ success: true, ...payload }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snapshots' },
      { status: 500 }
    )
  }
}
