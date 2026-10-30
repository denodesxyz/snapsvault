import { MARKET_URL } from '@/lib/links'

export type Contributor = {
  name: string
  image?: string
  logo_url?: string
  identity?: string
}

export type Snapshot = {
  block_height: number
  time: string
  size: string | number
  type: string
  chain: string
  chain_id: string
  url?: string
  tx_index?: string
  contributor: Contributor
  checksum?: { sha256?: string }
}

export type CliSnapshot = {
  chain_id: string
  chain: string
  height: number
  type: string
  size: string
  file_size: string
  download_url: string
  filename: string | null
  time: string
  contributor: Contributor
  checksum?: { sha256?: string }
}

export type Network = {
  network: string
  chain_id: string
  chains: string[]
  snapshot_count: number
  contributors: string[]
  types: string[]
  latest_snapshot: { height: number; time: string; contributor: string }
  display_name: string
}

// The landing reads the marketplace API on the server, so pages render with
// data. SNAPSHOTS_API_URL lets a local run point at another base URL.
const API_BASE = process.env.SNAPSHOTS_API_URL ?? MARKET_URL

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      console.error('[landing] fetch', path, res.status)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error('[landing] fetch failed', path, err)
    return null
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isString = (x: unknown): x is string => typeof x === 'string'
const isFiniteNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every(isString)

const hasRowBase = (x: Record<string, unknown>) =>
  isRecord(x.contributor) &&
  isString(x.contributor.name) &&
  x.contributor.name !== '' &&
  isString(x.chain_id) &&
  isString(x.chain) &&
  isString(x.type) &&
  isString(x.time) &&
  (isString(x.size) || isFiniteNumber(x.size))

const isSnapshot = (x: unknown): x is Snapshot => isRecord(x) && hasRowBase(x) && isFiniteNumber(x.block_height)

const isCliSnapshot = (x: unknown): x is CliSnapshot => isRecord(x) && hasRowBase(x) && isString(x.download_url) && isFiniteNumber(x.height)

const isNetwork = (x: unknown): x is Network =>
  isRecord(x) && isString(x.network) && isString(x.chain_id) && isString(x.display_name) && isStringArray(x.chains) && isStringArray(x.types)

const dataArray = <T,>(json: { data?: unknown } | null, guard: (x: unknown) => x is T): T[] | null =>
  Array.isArray(json?.data) ? (json.data as unknown[]).filter(guard) : null

export const CLI_LATEST_PATH = '/api/cli/latest?network=celestia&chain=mainnet&type=pruned'

export async function getCelestiaSnapshots(): Promise<Snapshot[] | null> {
  return dataArray(await getJson<{ data?: unknown }>('/api/snapshots?network=celestia'), isSnapshot)
}

export async function getNetworks(): Promise<Network[] | null> {
  return dataArray(await getJson<{ data?: unknown }>('/api/networks'), isNetwork)
}

export async function getCliSnapshots(): Promise<CliSnapshot[] | null> {
  return dataArray(await getJson<{ data?: unknown }>('/api/cli/snapshots?network=celestia'), isCliSnapshot)
}

export async function getCliLatest(): Promise<Record<string, unknown> | null> {
  const json = await getJson<{ data?: unknown }>(CLI_LATEST_PATH)
  return json?.data && typeof json.data === 'object' ? (json.data as Record<string, unknown>) : null
}

// Same precedence as the marketplace: a public https logo first, then the
// image path the API resolved (served by the marketplace host), then the
// bundled default.
export const contributorAvatarUrl = (c: Contributor) => {
  const logo = c.logo_url?.trim()
  if (logo && /^https:\/\/[^\s\\]+$/.test(logo)) return logo
  const image = c.image?.trim()
  if (image && image.startsWith('/') && !image.startsWith('//') && !/[\\\s]/.test(image)) return `${MARKET_URL}${image}`
  if (image && /^https:\/\/[^\s\\]+$/.test(image)) return image
  return '/default-contributor.svg'
}

// "3.20GB" -> "3.20 GB", "0GB" -> "N/A" (the documented fallback for a missing size).
export const formatSize = (size: string | number) => {
  if (size === 0 || size === '0GB') return 'N/A'
  if (typeof size === 'number') return size >= 1024 ? `${(size / 1024).toFixed(2)} TB` : `${size.toFixed(2)} GB`
  const m = /^([\d.]+)\s*([a-zA-Z]+)$/.exec(size.trim())
  return m ? `${m[1]} ${m[2].toUpperCase()}` : size
}
