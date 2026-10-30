import { NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { snapshotDbService } from '@/lib/database/snapshot-service'
import { snapshotConfigurationService } from '@/lib/database/snapshot-configuration-service'
import { newestSyncTime } from '@/lib/snapshots-payload'
import { networksSummary, toPublicNetworkFields } from '@/lib/public-names'


export async function GET() {
  try {
    
    const [snapshots, configurations] = await Promise.all([
      snapshotDbService.getCurrentSnapshots(),
      snapshotConfigurationService.getAllActiveConfigurations()
    ])

    const networksMap = new Map<string, {
      networkName: string
      chain_id: string
      chains: Set<string>
      hasSnapshots: boolean
      snapshotCount: number
      contributors: Set<string>
      types: Set<string>
      latestSnapshot?: {
        height: number
        time: string
        contributor: string
      }
    }>()

    snapshots.forEach(snapshot => {
      const networkKey = `${snapshot.chain.name.toLowerCase()}-${snapshot.chain_id}`
      
      if (!networksMap.has(networkKey)) {
        networksMap.set(networkKey, {
          networkName: snapshot.chain.name,
          chain_id: snapshot.chain_id,
          chains: new Set(),
          hasSnapshots: false,
          snapshotCount: 0,
          contributors: new Set(),
          types: new Set()
        })
      }
      
      const networkData = networksMap.get(networkKey)!
      networkData.chains.add(snapshot.network)
      networkData.hasSnapshots = true
      networkData.snapshotCount++
      networkData.contributors.add(snapshot.contributor.name)
      networkData.types.add(snapshot.type)
      
      if (!networkData.latestSnapshot || snapshot.block_height > networkData.latestSnapshot.height) {
        networkData.latestSnapshot = {
          height: snapshot.block_height,
          time: typeof snapshot.time === 'string' ? snapshot.time : snapshot.time.toISOString(),
          contributor: snapshot.contributor.name
        }
      }
    })

    configurations.forEach(config => {
      const networkKey = `${config.chainName.toLowerCase()}-${config.chain_id}`
      
      if (!networksMap.has(networkKey)) {
        networksMap.set(networkKey, {
          networkName: config.chainName,
          chain_id: config.chain_id,
          chains: new Set(),
          hasSnapshots: false,
          snapshotCount: 0,
          contributors: new Set(),
          types: new Set()
        })
      }
      
      const networkData = networksMap.get(networkKey)!
      networkData.chains.add(config.network)
      networkData.contributors.add(config.contributorName)
      networkData.types.add(config.type)
    })

    const networks = Array.from(networksMap.entries()).map(([, networkData]) => ({
      ...toPublicNetworkFields({ networkName: networkData.networkName, chain_id: networkData.chain_id, chains: Array.from(networkData.chains).sort() }),
      has_snapshots: networkData.hasSnapshots,
      snapshot_count: networkData.snapshotCount,
      contributors: Array.from(networkData.contributors).sort(),
      types: Array.from(networkData.types).sort(),
      latest_snapshot: networkData.latestSnapshot,
      display_name: `${networkData.networkName} (${networkData.chain_id})`,
      cli_id: `${networkData.networkName.toLowerCase()}-${networkData.chain_id}`
    }))

    networks.sort((a, b) => a.network.localeCompare(b.network))

    return NextResponse.json({
      success: true,
      data: networks,
      total: networks.length,
      summary: networksSummary(networks.map(n => ({ networkName: n.network, chain_id: n.chain_id, chains: n.chains, snapshotCount: n.snapshot_count, hasSnapshots: n.has_snapshots }))),
      last_updated: newestSyncTime(snapshots, configurations)
    }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })

  } catch (error) {
    console.error('Error fetching networks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch networks'
      },
      { status: 500 }
    )
  }
}
