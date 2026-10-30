import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { snapshotDbService } from '@/lib/database/snapshot-service'
import { sameLabel } from '@/lib/chain-kind'
import { parseNetworkParam, safeFilenameFromUrl, validateHttpsUrl } from '@/lib/validation/feed'
import { absoluteUrl, readChainQuery, toPublicAvailableOptions, toPublicChecksum, toPublicChainFields, toPublicFlatFields, toPublicQueryEcho } from '@/lib/public-names'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { network, chain_id, chain } = readChainQuery(searchParams)
    const latest = searchParams.get('latest') === 'true'
    const contributor = searchParams.get('contributor')
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'detailed'

    if (!network) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Network parameter is required',
          usage: {
            endpoint: '/api/cli/snapshots',
            required: ['network'],
            optional: ['chain_id', 'chain', 'latest', 'contributor', 'type', 'format'],
            examples: [
              '/api/cli/snapshots?network=celestia&latest=true',
              '/api/cli/snapshots?network=celestia&chain_id=celestia&chain=mainnet',
              '/api/cli/snapshots?network=celestia&contributor=noders&format=cli'
            ]
          }
        },
        { status: 400 }
      )
    }

    if (!parseNetworkParam(network).ok) {
      return NextResponse.json({ success: false, error: 'Invalid network parameter' }, { status: 400 })
    }


    const networkSnapshots = (await snapshotDbService.getSnapshotsByChain(network)).filter(snapshot => {
      const check = validateHttpsUrl(snapshot.download_url)
      if (!check.ok) console.warn(`CLI API: dropping stored snapshot ${snapshot.chain_id} #${snapshot.block_height}: ${check.reason}`)
      return check.ok
    })
    let snapshots = [...networkSnapshots]

    if (chain_id) {
      snapshots = snapshots.filter(snapshot => sameLabel(snapshot.chain_id, chain_id))
    }

    if (chain) {
      snapshots = snapshots.filter(snapshot => sameLabel(snapshot.network, chain))
    }

    if (contributor) {
      snapshots = snapshots.filter(snapshot => 
        snapshot.contributor.name.toLowerCase().includes(contributor.toLowerCase())
      )
    }

    if (type) {
      snapshots = snapshots.filter(snapshot => sameLabel(snapshot.type, type))
    }

    if (latest) {
      const latestSnapshots = new Map()
      
      snapshots.forEach(snapshot => {
        const key = `${snapshot.chain_id}-${snapshot.network}`
        const existing = latestSnapshots.get(key)
        
        if (!existing || snapshot.block_height > existing.block_height) {
          latestSnapshots.set(key, snapshot)
        }
      })
      
      snapshots = Array.from(latestSnapshots.values())
    }

    snapshots.sort((a, b) => {
      if (b.block_height !== a.block_height) {
        return b.block_height - a.block_height
      }
      return new Date(b.time).getTime() - new Date(a.time).getTime()
    })

    const formattedSnapshots = snapshots.map(snapshot => {
      const contributor = snapshot.contributor

      const baseInfo = {
        ...toPublicFlatFields(snapshot),
        height: snapshot.block_height,
        contributor: snapshot.contributor.name,
        type: snapshot.type,
        size: snapshot.size,
        download_url: snapshot.download_url,
        time: typeof snapshot.time === 'string' ? snapshot.time : snapshot.time.toISOString(),
        compression: snapshot.compression
      }

      if (format === 'cli') {
        return {
          ...baseInfo,
          id: `${snapshot.chain.name.toLowerCase()}-${snapshot.chain_id}-${snapshot.network}-${snapshot.block_height}-${snapshot.contributor.name.toLowerCase()}-${snapshot.type}`,
          display_name: `${snapshot.chain.name} ${snapshot.network} #${snapshot.block_height} by ${snapshot.contributor.name} (${snapshot.type})`,
          file_size: formatFileSize(snapshot.size),
          filename: safeFilenameFromUrl(snapshot.download_url)
        }
      }

      return {
        ...baseInfo,
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
        ...toPublicChainFields(snapshot),
        period: snapshot.period,
        tx_index: snapshot.tx_index,
        checksum: toPublicChecksum(snapshot.checksum),
        instructions: snapshot.instructions,
        file_size: formatFileSize(snapshot.size),
        filename: safeFilenameFromUrl(snapshot.download_url)
      }
    })

    const availableOptions = toPublicAvailableOptions(networkSnapshots)

    return NextResponse.json({
      success: true,
      data: formattedSnapshots,
      total: formattedSnapshots.length,
      filters: {
        ...toPublicQueryEcho({ network, chain_id, chain }),
        latest,
        contributor,
        type,
        format
      },
      available_options: availableOptions,
      last_updated: new Date().toISOString()
    }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })

  } catch (error) {
    console.error('CLI API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch snapshots'
      },
      { status: 500 }
    )
  }
}

function formatFileSize(size: string | number): string {
  // If it's already a formatted string like "912Gb", just add space
  if (typeof size === 'string') {
    const match = size.match(/^([\d.]+)\s*([a-zA-Z]+)$/)
    if (match) {
      const value = match[1]
      const unit = match[2].toUpperCase()
      return `${value} ${unit}`
    }
    return size
  }
  
  // A bare number is read as GB, the same as on the site
  return `${parseFloat(size.toFixed(2))} GB`
}
