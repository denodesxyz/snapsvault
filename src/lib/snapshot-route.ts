import { parseNetworkParam } from '@/lib/validation/feed'

export type SnapshotRouteParams = { network: string; chain_id: string; height: string; contributor: string }

const HEIGHT = /^\d+$/

// Validates /[network]/[chain_id]/[height]/[contributor]. Matches the detail page:
// network, chain_id and height as given, contributor URL-decoded. Null when malformed.
export function parseSnapshotRouteParams(params: Partial<Record<keyof SnapshotRouteParams, unknown>>): SnapshotRouteParams | null {
  const { network, chain_id, height, contributor } = params
  if (typeof network !== 'string' || typeof chain_id !== 'string' || typeof height !== 'string' || typeof contributor !== 'string') return null
  const parsedNetwork = parseNetworkParam(network)
  if (!parsedNetwork.ok || !parsedNetwork.value) return null
  if (!chain_id || !HEIGHT.test(height)) return null
  let decodedContributor: string
  try {
    decodedContributor = decodeURIComponent(contributor)
  } catch {
    return null
  }
  if (!decodedContributor) return null
  return { network: parsedNetwork.value, chain_id, height, contributor: decodedContributor }
}
