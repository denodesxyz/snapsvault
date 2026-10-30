import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { contributorService } from '@/lib/database/contributor-service'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

function parseLimitParam(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT
  const parsed = parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const limit = parseLimitParam(searchParams.get('limit'))

    if (name) {
      const contributor = await contributorService.getContributorByName(name)
      
      if (!contributor) {
        return NextResponse.json(
          { success: false, error: 'Contributor not found' },
          { status: 404 }
        )
      }

      const snapshotCounts = await contributorService.countCurrentSnapshots([contributor.name])

      return NextResponse.json({
        success: true,
        data: {
          name: contributor.name,
          email: contributor.email,
          discord: contributor.discord,
          telegram: contributor.telegram,
          x: contributor.x,
          description: contributor.description,
          website: contributor.website,
          identity: contributor.identity,
          logo_url: contributor.logo_url,
          contributor_since: contributor.registryAddedAt ?? null,
          number_of_snapshots: snapshotCounts.get(contributor.name) ?? 0,
          networks_covered: contributor.networksCovered,
          snapshot_freshness: contributor.snapshotFreshness,
          uptime_availability: contributor.uptimeAvailability,
          created_at: contributor.createdAt,
          updated_at: contributor.updatedAt
        }
      }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
    } else {
      const contributors = await contributorService.listContributors(limit)
      const snapshotCounts = await contributorService.countCurrentSnapshots(contributors.map(c => c.name))

      return NextResponse.json({
        success: true,
        data: contributors.map(contributor => ({
          name: contributor.name,
          description: contributor.description,
          website: contributor.website,
          logo_url: contributor.logo_url,
          number_of_snapshots: snapshotCounts.get(contributor.name) ?? 0,
          networks_covered: contributor.networksCovered,
          uptime_percentage: contributor.uptimeAvailability.percentage,
          contributor_since: contributor.registryAddedAt ?? null
        }))
      }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
    }

  } catch (error) {
    console.error('Contributors API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch contributors'
      },
      { status: 500 }
    )
  }
}
