import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { snapshotDbService } from '@/lib/database/snapshot-service'
import { validateHttpsUrl } from '@/lib/validation/feed'
import { NETWORK_DATA } from '@/lib/constants'
import { SITE_ORIGIN } from '@/lib/public-names'
import { NOT_FOUND_TITLE } from '@/components/not-found-panel'
import { parseSnapshotRouteParams, type SnapshotRouteParams as RouteParams } from '@/lib/snapshot-route'

const DB_CHECK_TIMEOUT_MS = 1500
const CHECK_REUSE_MS = 5000

type StoredMatch = { network: string; chain_id: string; height: string; contributor: string }

// Same lookup as /api/snapshots?network=, same match as the detail page.
// The stored snapshot behind the URL, false when there is none, null when the database cannot answer.
async function querySnapshot({ network, chain_id, height, contributor }: RouteParams): Promise<StoredMatch | false | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${DB_CHECK_TIMEOUT_MS} ms`)), DB_CHECK_TIMEOUT_MS)
    })
    const snapshots = await Promise.race([snapshotDbService.getSnapshotsByChain(network), timeout])
    const found = snapshots.find(s =>
      validateHttpsUrl(s.download_url).ok &&
      (s.chain?.name?.toLowerCase() || '') === network.toLowerCase() &&
      s.chain_id === chain_id &&
      s.block_height.toString() === height &&
      (s.contributor?.name?.toLowerCase() || '') === contributor.toLowerCase()
    )
    if (!found) return false
    return { network: found.chain.name.toLowerCase(), chain_id: found.chain_id, height: found.block_height.toString(), contributor: found.contributor.name }
  } catch (error) {
    console.warn('Snapshot detail: existence check skipped,', error instanceof Error ? error.message : error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// One query per URL for a few seconds: generateMetadata, the layout and the
// not-found render pass of a 404 all ask, and React cache() does not span them.
const recentChecks = new Map<string, Promise<StoredMatch | false | null>>()

function snapshotLookup(params: RouteParams): Promise<StoredMatch | false | null> {
  const key = JSON.stringify([params.network.toLowerCase(), params.chain_id, params.height, params.contributor.toLowerCase()])
  let check = recentChecks.get(key)
  if (!check) {
    check = querySnapshot(params)
    recentChecks.set(key, check)
    setTimeout(() => recentChecks.delete(key), CHECK_REUSE_MS).unref?.()
  }
  return check
}

// True for malformed params or a snapshot the database does not have.
// False when it exists or the database cannot answer.
async function isMissing(params: RouteParams | null): Promise<boolean> {
  if (!params) return true
  return (await snapshotLookup(params)) === false
}

function networkDisplayName(network: string): string {
  const key = network.toLowerCase()
  if (Object.hasOwn(NETWORK_DATA, key)) return NETWORK_DATA[key as keyof typeof NETWORK_DATA].name
  return network.charAt(0).toUpperCase() + network.slice(1)
}

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const snapshot = parseSnapshotRouteParams(await params)
  // The layout answers 404 here; the client keeps this title after hydration.
  if (!snapshot || (await isMissing(snapshot))) return { title: NOT_FOUND_TITLE }
  const stored = (await snapshotLookup(snapshot)) || { ...snapshot, network: snapshot.network.toLowerCase() }
  const networkName = networkDisplayName(stored.network)
  // A stored height of 0 means the contributor publishes none (archive snapshots), so it is left out.
  const hasHeight = Number(stored.height) > 0
  const title = hasHeight
    ? `${networkName} snapshot #${stored.height} by ${stored.contributor} | SnapsVault`
    : `${networkName} archive snapshot by ${stored.contributor} | SnapsVault`
  const description = hasHeight
    ? `${networkName} snapshot at block height ${stored.height} from ${stored.contributor} on the SnapsVault community marketplace`
    : `${networkName} archive snapshot from ${stored.contributor} on the SnapsVault community marketplace`
  const previous = await parent
  const path = `/${stored.network}/${stored.chain_id}/${stored.height}/${encodeURIComponent(stored.contributor)}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_ORIGIN}${path}`,
      siteName: 'SnapsVault',
      locale: 'en_US',
      type: 'website',
      images: previous.openGraph?.images ?? [],
    },
  }
}

export default async function SnapshotDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<RouteParams>
}) {
  if (await isMissing(parseSnapshotRouteParams(await params))) notFound()
  return children
}
