import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { snapshotConfigurationService } from '@/lib/database/snapshot-configuration-service'
import { githubDataService } from '@/lib/github-data-service'
import { validateHttpsUrl } from '@/lib/validation/feed'
import { readChainQuery, toPublicConfigurationFields, toPublicConfigurationStats, toPublicConfigurationSummary } from '@/lib/public-names'
import { ISnapshotConfiguration } from '@/lib/database/models/snapshot-configuration'

function safeLatestSnapshot(config: ISnapshotConfiguration) {
  const latest = config.latestSnapshot
  if (latest && !validateHttpsUrl(latest.url).ok) {
    console.warn(`Configuration API: hiding latest snapshot of ${config.contributorName} ${config.chainName}/${config.chain_id}: unsafe url`)
    return null
  }
  return latest
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { network, chain_id } = readChainQuery(searchParams)
    const contributor = searchParams.get('contributor')

    if (network && chain_id) {
      const configurations = await snapshotConfigurationService.getConfigurationsByChain(network, chain_id)
      
      return NextResponse.json({
        success: true,
        data: configurations.map(config => ({
          contributor_name: config.contributorName,
          type: config.type,
          period: config.period,
          tx_index: config.tx_index,
          ...toPublicConfigurationFields(config, false),
          is_active: config.isActive,
          is_available: !!config.latestSnapshot,
          latest_snapshot: safeLatestSnapshot(config),
          last_successful_fetch: config.lastSuccessfulFetch,
          consecutive_failures: config.consecutiveFailures,
          uptime_percentage: config.uptimeChecks.totalChecks > 0 
            ? (config.uptimeChecks.successfulChecks / config.uptimeChecks.totalChecks) * 100 
            : 0
        }))
      }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
    } else if (contributor) {
      const configurations = await snapshotConfigurationService.getConfigurationsByContributor(contributor)
      
      return NextResponse.json({
        success: true,
        data: configurations.map(config => ({
          ...toPublicConfigurationFields(config, true),
          chain_id: config.chain_id,
          type: config.type,
          period: config.period,
          tx_index: config.tx_index,
          is_active: config.isActive,
          is_available: !!config.latestSnapshot,
          latest_snapshot: safeLatestSnapshot(config),
          last_successful_fetch: config.lastSuccessfulFetch,
          consecutive_failures: config.consecutiveFailures,
          uptime_percentage: config.uptimeChecks.totalChecks > 0 
            ? (config.uptimeChecks.successfulChecks / config.uptimeChecks.totalChecks) * 100 
            : 0
        }))
      }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
    } else {
      const displayData = await githubDataService.getConfigurationDisplayData()
      const stats = await snapshotConfigurationService.getConfigurationStats()
      
      return NextResponse.json({
        success: true,
        data: {
          summary: toPublicConfigurationSummary(displayData),
          stats: toPublicConfigurationStats(stats)
        }
      }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
    }

  } catch (error) {
    console.error('Configuration API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch configurations'
      },
      { status: 500 }
    )
  }
}
