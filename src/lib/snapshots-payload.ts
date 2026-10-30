import { snapshotDbService } from '@/lib/database/snapshot-service'
import { snapshotConfigurationService } from '@/lib/database/snapshot-configuration-service'
import { ISnapshot } from '@/lib/database/models/snapshot'
import { ISnapshotConfiguration } from '@/lib/database/models/snapshot-configuration'
import { IContributor } from '@/lib/database/models/contributor'
import { keybaseAvatarPath, validateHttpsUrl } from '@/lib/validation/feed'
import { sameLabel } from '@/lib/chain-kind'
import { absoluteUrl, toPublicChainFields, toPublicChecksum } from '@/lib/public-names'

// Body of GET /api/snapshots, shared with the server-rendered home page so
// both read the same data the same way. Throws on database errors; callers
// decide how to report them.

function withSafeDownloadUrl(snapshots: ISnapshot[]): ISnapshot[] {
  return snapshots.filter(snapshot => {
    const check = validateHttpsUrl(snapshot.download_url)
    if (!check.ok) console.warn(`Snapshots API: dropping stored snapshot ${snapshot.chain_id} #${snapshot.block_height}: ${check.reason}`)
    return check.ok
  })
}

// Time of the newest sync that touched this data: every sync stamps the
// snapshots it sees (last_seen) and each configuration's fetch result. Null
// when there is nothing to date.
export function newestSyncTime(
  snapshots: Pick<ISnapshot, 'last_seen'>[],
  configurations: Pick<ISnapshotConfiguration, 'lastSuccessfulFetch' | 'lastFailedFetch'>[] = []
): string | null {
  let newest = 0
  const consider = (value: Date | null | undefined) => {
    const ms = value ? new Date(value).getTime() : NaN
    if (Number.isFinite(ms) && ms > newest) newest = ms
  }
  snapshots.forEach(snapshot => consider(snapshot.last_seen))
  configurations.forEach(config => {
    consider(config.lastSuccessfulFetch)
    consider(config.lastFailedFetch)
  })
  return newest > 0 ? new Date(newest).toISOString() : null
}

export async function getSnapshotsPayload({ network, chain }: { network: string | null; chain: string | null }) {

  if (network) {
    let snapshots = withSafeDownloadUrl(await snapshotDbService.getSnapshotsByChain(network))

    if (chain) {
      snapshots = snapshots.filter((snapshot: ISnapshot) => sameLabel(snapshot.network, chain))
    }


    return {
      data: snapshots.map(transformDbSnapshotToApiFormat),
      last_updated: newestSyncTime(snapshots)
    }
  }

  const [storedSnapshots, configurations] = await Promise.all([
    snapshotDbService.getCurrentSnapshots(),
    snapshotConfigurationService.getAllActiveConfigurations()
  ])


  const dbSnapshots = withSafeDownloadUrl(storedSnapshots)
  const allSnapshotData = []

  allSnapshotData.push(...dbSnapshots.map(transformDbSnapshotToApiFormat))

  const unavailableConfigurations = configurations.filter(config => !dbSnapshots.some((snapshot: ISnapshot) =>
    snapshot.chain.name.toLowerCase() === config.chainName &&
    snapshot.chain_id === config.chain_id &&
    snapshot.contributor.name === config.contributorName &&
    snapshot.type === config.type
  ))

  const contributorsByName = await getContributorsByName(unavailableConfigurations.map(config => config.contributorName))
  allSnapshotData.push(...unavailableConfigurations.map(config =>
    transformConfigurationToSkeletonSnapshot(config, contributorsByName.get(config.contributorName))
  ))

  return {
    data: allSnapshotData,
    available_count: dbSnapshots.length,
    configuration_count: configurations.length,
    last_updated: newestSyncTime(dbSnapshots, configurations)
  }
}

function transformDbSnapshotToApiFormat(snapshot: ISnapshot) {
  const snapshotObj = (snapshot && typeof snapshot.toObject === 'function')
    ? snapshot.toObject()
    : snapshot

  const contributor = snapshotObj.contributor || {}

  return {
    block_height: snapshotObj.block_height,
    time: snapshotObj.time,
    size: snapshotObj.size,
    url: snapshotObj.download_url,
    type: snapshotObj.type,
    ...toPublicChainFields(snapshotObj),
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
    period: snapshotObj.period,
    tx_index: snapshotObj.tx_index,
    checksum: toPublicChecksum(snapshotObj.checksum),
    compression: snapshotObj.compression,
    instructions: snapshotObj.instructions,
    is_available: true
  }
}

// One query for every contributor named by a configuration without a stored
// snapshot. On failure the rows fall back to the default contributor data.
async function getContributorsByName(names: string[]): Promise<Map<string, IContributor>> {
  const byName = new Map<string, IContributor>()
  const uniqueNames = [...new Set(names)]
  if (uniqueNames.length === 0) return byName

  try {
    const { contributorService } = await import('@/lib/database/contributor-service')
    for (const contributor of await contributorService.getContributorsByNames(uniqueNames)) {
      if (!byName.has(contributor.name)) byName.set(contributor.name, contributor)
    }
  } catch (error) {
    console.warn('Failed to fetch full contributor data:', error)
  }
  return byName
}

function transformConfigurationToSkeletonSnapshot(config: ISnapshotConfiguration, fullContributor: IContributor | undefined) {
  let contributorData = {
    name: config.contributorName,
    image: absoluteUrl('/default-contributor.svg'),
    logo_url: null as string | null,
    website: null as string | null,
    description: null as string | null,
    email: null as string | null,
    discord: null as string | null,
    telegram: null as string | null,
    x: null as string | null,
    identity: null as string | null
  }

  if (fullContributor) {
    contributorData = {
      name: fullContributor.name,
      image: absoluteUrl(keybaseAvatarPath(fullContributor.identity)),
      logo_url: fullContributor.logo_url || null,
      website: fullContributor.website || null,
      description: fullContributor.description || null,
      email: fullContributor.email || null,
      discord: fullContributor.discord || null,
      telegram: fullContributor.telegram || null,
      x: fullContributor.x || null,
      identity: fullContributor.identity || null
    }
  }

  return {
    block_height: 0,
    time: new Date(),
    size: 0,
    url: '',
    type: config.type,
    ...toPublicChainFields({
      chain: {
        name: config.chainName.charAt(0).toUpperCase() + config.chainName.slice(1),
        display_name: config.chainName.charAt(0).toUpperCase() + config.chainName.slice(1),
        image: `/${config.chainName}-logo.svg`
      },
      network: config.network,
      chain_id: config.chain_id
    }),
    contributor: contributorData,
    period: config.period,
    tx_index: config.tx_index ? 'true' : 'false',
    is_available: false,
    is_unavailable: true,
    unavailable_reason: config.consecutiveFailures > 0
      ? `Service temporarily unavailable (${config.consecutiveFailures} consecutive failures)`
      : 'Snapshot data currently unavailable',
    last_attempt: config.lastFailedFetch
  }
}
