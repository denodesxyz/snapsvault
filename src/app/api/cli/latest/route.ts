import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'
import { snapshotDbService } from '@/lib/database/snapshot-service'
import { chainForQuery, sameLabel } from '@/lib/chain-kind'
import { parseNetworkParam, safeFilenameFromUrl, validateHttpsUrl } from '@/lib/validation/feed'
import { absoluteUrl, readChainQuery, toPublicChainFields, toPublicChecksum, toPublicQueryEcho } from '@/lib/public-names'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = readChainQuery(searchParams)
    const network = query.network
    const chain_id = query.chain_id
    // A chain ID without a chain gives the chain of that chain ID; with neither, mainnet.
    const chain = chainForQuery(query.chain, chain_id) || 'mainnet'
    const type = searchParams.get('type')
    const contributor = searchParams.get('contributor')

    if (!network) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Network parameter is required',
          usage: {
            endpoint: '/api/cli/latest',
            required: ['network'],
            optional: ['chain_id', 'chain (default: the chain of chain_id, else mainnet)', 'type', 'contributor'],
            examples: [
              '/api/cli/latest?network=celestia',
              '/api/cli/latest?network=celestia&chain_id=mocha-5&chain=testnet',
              '/api/cli/latest?network=celestia&chain=testnet&type=archive'
            ]
          }
        },
        { status: 400 }
      )
    }

    if (!parseNetworkParam(network).ok) {
      return NextResponse.json({ success: false, error: 'Invalid network parameter' }, { status: 400 })
    }


    let snapshots = (await snapshotDbService.getSnapshotsByChain(network)).filter(snapshot => {
      const check = validateHttpsUrl(snapshot.download_url)
      if (!check.ok) console.warn(`CLI Latest API: dropping stored snapshot ${snapshot.chain_id} #${snapshot.block_height}: ${check.reason}`)
      return check.ok
    })

    if (chain_id) {
      snapshots = snapshots.filter(snapshot => sameLabel(snapshot.chain_id, chain_id))
    }

    snapshots = snapshots.filter(snapshot => sameLabel(snapshot.network, chain))

    if (type) {
      snapshots = snapshots.filter(snapshot => sameLabel(snapshot.type, type))
    }

    if (contributor) {
      snapshots = snapshots.filter(snapshot => 
        snapshot.contributor.name.toLowerCase().includes(contributor.toLowerCase())
      )
    }

    if (snapshots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No snapshots found matching criteria',
        criteria: { ...toPublicQueryEcho({ network, chain_id, chain }), type, contributor },
        suggestion: 'Try removing some filters or check available networks at /api/networks'
      }, { status: 404 })
    }

    const latestSnapshot = snapshots.reduce((latest, current) => 
      current.block_height > latest.block_height ? current : latest
    )

    const result = {
      ...toPublicChainFields(latestSnapshot),
      height: latestSnapshot.block_height,
      contributor: {
        name: latestSnapshot.contributor.name,
        image: absoluteUrl(latestSnapshot.contributor.image),
        logo_url: latestSnapshot.contributor.logo_url || null,
        website: latestSnapshot.contributor.website || null,
        description: latestSnapshot.contributor.description || null,
        email: latestSnapshot.contributor.email || null,
        discord: latestSnapshot.contributor.discord || null,
        telegram: latestSnapshot.contributor.telegram || null,
        x: latestSnapshot.contributor.x || null,
        identity: latestSnapshot.contributor.identity || null
      },
      type: latestSnapshot.type,
      size: latestSnapshot.size,
      file_size: formatFileSize(latestSnapshot.size),
      download_url: latestSnapshot.download_url,
      filename: safeFilenameFromUrl(latestSnapshot.download_url),
      time: typeof latestSnapshot.time === 'string' ? latestSnapshot.time : latestSnapshot.time.toISOString(),
      compression: latestSnapshot.compression,
      checksum: toPublicChecksum(latestSnapshot.checksum),

      contributor_info: {
        name: latestSnapshot.contributor.name,
        website: latestSnapshot.contributor.website,
        identity: latestSnapshot.contributor.identity
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      alternatives: {
        other_contributors: [...new Set(snapshots
          .filter(s => s.contributor.name !== latestSnapshot.contributor.name)
          .map(s => s.contributor.name)
        )],
        other_types: [...new Set(snapshots
          .filter(s => s.type !== latestSnapshot.type)
          .map(s => s.type)
        )],
        total_snapshots: snapshots.length
      },
      last_updated: new Date().toISOString()
    }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })

  } catch (error) {
    console.error('CLI Latest API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch latest snapshot'
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
