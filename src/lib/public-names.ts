// Public vocabulary of the API and the UI. Stored snapshots keep their field
// names: `chain` holds the network (Celestia), `network` holds mainnet or
// testnet. Every response and query parameter goes through this module.
//
//   network  the blockchain network: Celestia
//   chain    mainnet or testnet
//   chain_id celestia, mocha-4, mocha-5

export const SITE_ORIGIN = 'https://celestia.snapsvault.xyz'

// Paths the app serves (logos, avatars) go out as absolute URLs; anything else is returned as is.
export function absoluteUrl(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? `${SITE_ORIGIN}${value}` : value
}

// The same URL back as a path when it points at this site, so the app keeps loading its own images locally.
export function relativeUrl(value: string): string {
  return value.startsWith(`${SITE_ORIGIN}/`) ? value.slice(SITE_ORIGIN.length) : value
}

// Only the hashes, never the stored sub-document id.
export function toPublicChecksum(checksum: { sha256?: string | null; md5?: string | null } | null | undefined) {
  if (!checksum) return undefined
  const out: { sha256?: string; md5?: string } = {}
  if (checksum.sha256) out.sha256 = checksum.sha256
  if (checksum.md5) out.md5 = checksum.md5
  return Object.keys(out).length > 0 ? out : undefined
}

export interface NetworkInfo {
  name: string
  display_name: string
  image: string
}

interface StoredChainFields {
  chain: NetworkInfo
  network: string
  chain_id: string
}

export interface PublicChainFields {
  network: NetworkInfo
  chain: string
  chain_id: string
}

export function toPublicChainFields(stored: StoredChainFields): PublicChainFields {
  return {
    network: {
      name: stored.chain.name,
      display_name: stored.chain.display_name,
      image: absoluteUrl(stored.chain.image)
    },
    chain: stored.network,
    chain_id: stored.chain_id
  }
}

export interface ChainQuery {
  // Celestia
  network: string | null
  // mainnet or testnet
  chain: string | null
  chain_id: string | null
}

export function readChainQuery(searchParams: URLSearchParams): ChainQuery {
  return {
    network: searchParams.get('network'),
    chain: searchParams.get('chain'),
    chain_id: searchParams.get('chain_id')
  }
}

// Flat form used by the format=cli rows: network is the name, chain is mainnet or testnet.
export function toPublicFlatFields(stored: { chain: { name: string }; network: string; chain_id: string }) {
  return { network: stored.chain.name, chain_id: stored.chain_id, chain: stored.network }
}

// /api/networks: one row per network and chain ID.
export interface NetworkRowInput {
  networkName: string
  chain_id: string
  chains: string[]
  snapshotCount: number
  hasSnapshots: boolean
}

export function toPublicNetworkFields(row: Pick<NetworkRowInput, 'networkName' | 'chain_id' | 'chains'>) {
  return { network: row.networkName, chain_id: row.chain_id, chains: row.chains }
}

// Rows are chain IDs: networks counts distinct network names, chains distinct mainnet/testnet values.
export function networksSummary(rows: NetworkRowInput[]) {
  return {
    total_networks: new Set(rows.map(r => r.networkName.toLowerCase())).size,
    total_chain_ids: rows.length,
    chain_ids_with_snapshots: rows.filter(r => r.hasSnapshots).length,
    total_snapshots: rows.reduce((sum, r) => sum + r.snapshotCount, 0),
    total_chains: new Set(rows.flatMap(r => r.chains)).size
  }
}

// /api/snapshot-configurations: the stored config keeps chainName (network) and network (chain).
export function toPublicConfigurationFields(config: { chainName: string; network: string }, withNetwork: boolean) {
  return withNetwork ? { network: config.chainName, chain: config.network } : { chain: config.network }
}

// Summary rows are keyed "<network>/<chain ID>" by the service.
export function toPublicConfigurationSummary<T extends { chains: Array<{ name: string; configurationsCount: number; availableCount: number }> }>(summary: T) {
  const { chains, ...rest } = summary
  return {
    ...rest,
    chain_ids: chains.map(({ name, ...counts }) => {
      const slash = name.indexOf('/')
      return { network: name.slice(0, slash), chain_id: name.slice(slash + 1), ...counts }
    })
  }
}

export function toPublicConfigurationStats<T extends { configurationsByChain: Array<{ chainName: string; count: number }> }>(stats: T) {
  const { configurationsByChain, ...rest } = stats
  return { ...rest, configurations_by_network: configurationsByChain.map(({ chainName, count }) => ({ network: chainName, count })) }
}

// Echo of the request filters, in the public order.
export function toPublicQueryEcho(query: ChainQuery) {
  return { network: query.network, chain_id: query.chain_id, chain: query.chain }
}

// available_options of /api/cli/snapshots, from stored snapshots.
export function toPublicAvailableOptions(snapshots: Array<{ chain_id: string; network: string; type: string; contributor: { name: string } }>) {
  const unique = (values: string[]) => [...new Set(values)].sort()
  return {
    chain_ids: unique(snapshots.map(s => s.chain_id)),
    chains: unique(snapshots.map(s => s.network)),
    contributors: unique(snapshots.map(s => s.contributor.name)),
    types: unique(snapshots.map(s => s.type))
  }
}
