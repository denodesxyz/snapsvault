import { classifyChainId } from './chain-kind'
import { contributorService } from './database/contributor-service'
import { snapshotConfigurationService } from './database/snapshot-configuration-service'
import { snapshotDbService } from './database/snapshot-service'
import { unreadFeedScope, type ProtectedScope } from './snapshot-identity'
import { commitDate, lastPageFromLink, resolveRegistryJoin, type RegistryJoinResult } from './registry-commits'
import {
  FEED_TIMEOUT_MS,
  MAX_FEED_ENTRIES,
  truncateForLog,
  validateContributor,
  validateDirectoryName,
  validateRegistryFileName,
  validateSnapshotEndpoint
} from './validation/feed'
import { readFeed } from './feed-reader'

const KEYBASE_IDENTITY = /^[0-9A-Fa-f]{16}$/

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${truncateForLog(error.message)}` : truncateForLog(error)
}

function blockchainDisplayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function contributorImage(identity?: string): string {
  return identity && KEYBASE_IDENTITY.test(identity) ? `/api/keybase-avatar/${identity}` : '/default-contributor.svg'
}

interface GitHubConfig {
  owner: string
  repo: string
  branch: string
  token?: string
}

interface Contributor {
  name: string
  email?: string
  discord?: string
  telegram?: string
  x?: string
  description?: string
  website?: string
  identity?: string
  logoUrl?: string
}

interface SnapshotEndpoint {
  snapshots: string
  period?: string
  type?: string
  tx_index?: string
}

interface ContributorData {
  contributor: Contributor
  snapshots: SnapshotEndpoint[]
  registryPath: string
}

interface GitHubFileItem {
  name: string
  type: 'file' | 'dir'
  download_url?: string
  url: string
}

type GitHubDirectoryResponse = GitHubFileItem[]

export interface SnapshotInfo {
  block_height: number
  time: string
  size: string | number
  type: string
  chain: {
    name: string
    image: string
  }
  network: string
  chain_id: string
  contributor: {
    name: string
    image: string
    logoUrl?: string
    website?: string
    description?: string
    email?: string
    discord?: string
    telegram?: string
    x?: string
    identity?: string
  }
  period: string
  tx_index: string
  checksum?: {
    sha256?: string
    md5?: string
  }
  filename?: string
  url?: string
  configuration_id?: string 
}

export interface SnapshotData {
  url: string
  period?: string
  type?: string
  tx_index?: boolean | string
  size: number | string
  creation_date: string
  latest_block_height?: number | string
  sha256sum?: string
  
  // Legacy fields
  filename?: string
  height?: number
  block_height?: number
  time?: string
  download_url?: string
  checksum?: {
    sha256?: string
    md5?: string
  }
  compression?: string
  instructions?: string
}

export interface SnapshotConfigurationInfo {
  contributorName: string
  contributorData: {
    name: string
    email?: string
    discord?: string
    telegram?: string
    x?: string
    description?: string
    website?: string
    identity?: string
    logo_url?: string
  }
  configuration: {
    snapshotsJsonUrl: string
    period: string
    type: string
    tx_index: boolean
    chainName: string
    chain_id: string
    network: string
  }
  latestSnapshots?: Array<{
    filename: string
    url: string
    size: string | number
    height: number
    creationDate: Date
    period?: string
    type?: string
    tx_index?: boolean | string
    sha256sum?: string
  }>
  is_available: boolean
  // False when the feed could not be read (bad URL, timeout, error status, not a JSON array).
  feed_read: boolean
  error?: string
}

interface RegistryRead {
  // False when any chain directory, contributor file or snapshot endpoint was skipped or failed.
  complete: boolean
  pathsByName: Map<string, Set<string>>
}

class GitHubDataService {
  private config: GitHubConfig
  private baseUrl: string

  constructor(config: GitHubConfig) {
    this.config = config
    this.baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents`
  }

  private async fetchFromGitHub(path: string): Promise<GitHubDirectoryResponse | ContributorData | null> {
    const url = `${this.baseUrl}/${path}?ref=${this.config.branch}`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SnapsVault-App'
    }

    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`
    }

    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        return JSON.parse(content)
      }
      
      return data
    } catch (error) {
      // Only pass through known-safe messages; others (e.g. an invalid header value) can embed the token.
      const name = error instanceof Error ? error.name : 'UnknownError'
      const message = error instanceof Error ? error.message : ''
      const isSafe = message.startsWith('GitHub API error: ') || (name === 'TypeError' && message === 'fetch failed')
      if (isSafe) {
        console.error(`Error fetching ${path}: ${name}: ${message}`)
        throw error
      }
      console.error(`Error fetching ${path}: ${name}: request failed (details withheld)`)
      throw new Error('GitHub request failed')
    }
  }

  // Date of the oldest commit that touched a registry file, read from the commits API
  // (the last page of a one-item-per-page listing). Null when it cannot be read.
  private async firstCommitDate(path: string): Promise<Date | null> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SnapsVault-App'
    }
    if (this.config.token) headers['Authorization'] = `token ${this.config.token}`

    const base = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits?sha=${encodeURIComponent(this.config.branch)}&path=${encodeURIComponent(path)}&per_page=1`
    try {
      const first = await fetch(base, { headers, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) })
      if (!first.ok) throw new Error(`GitHub API error: ${first.status}`)
      const firstList = await first.json()
      if (!Array.isArray(firstList) || firstList.length === 0) return null
      const lastPage = lastPageFromLink(first.headers.get('link'))
      if (lastPage === null) return commitDate(firstList[0])

      const last = await fetch(`${base}&page=${lastPage}`, { headers, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) })
      if (!last.ok) throw new Error(`GitHub API error: ${last.status}`)
      const lastList = await last.json()
      return Array.isArray(lastList) && lastList.length > 0 ? commitDate(lastList[0]) : null
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith('GitHub API error: ') ? error.message : 'request failed (details withheld)'
      console.error(`Error reading commit history of ${path}: ${message}`)
      return null
    }
  }

  // Registry join data per contributor name, resolved only after a complete registry read and
  // only for files not covered by the stored value.
  private async resolveRegistryJoin(registry: RegistryRead): Promise<Map<string, RegistryJoinResult>> {
    const resolved = new Map<string, RegistryJoinResult>()
    if (!registry.complete) {
      console.warn('Registry read was incomplete; contributor join dates are not resolved this run')
      return resolved
    }
    try {
      const stored = await contributorService.getRegistryJoinByNames([...registry.pathsByName.keys()])
      for (const [name, paths] of registry.pathsByName) {
        const result = await resolveRegistryJoin(stored.get(name), [...paths], true, path => this.firstCommitDate(path))
        if (result) resolved.set(name, result)
      }
    } catch (error) {
      console.error(`Could not resolve registry join dates: ${describeError(error)}`)
    }
    return resolved
  }

  // `read` is true only when the feed was fetched and parsed as a JSON array; an empty result with
  // read false is a failure and says nothing about what the contributor still lists.
  private async fetchSnapshotsFromUrl(url: string, registryType?: string): Promise<{ snapshots: SnapshotData[]; read: boolean }> {
    const { entries, read } = await readFeed(url, registryType)
    return { snapshots: entries as SnapshotData[], read }
  }

  private async getContributors(blockchainName: string, chain_id: string): Promise<{ contributors: ContributorData[]; complete: boolean }> {
    let complete = true
    try {
      const contents = await this.fetchFromGitHub(`chains/${blockchainName}/${chain_id}`)
      if (!Array.isArray(contents)) {
        return { contributors: [], complete: false }
      }

      const contributorFiles = contents.filter(item => {
        if (item.type !== 'file' || typeof item.name !== 'string' || !item.name.endsWith('.json')) return false
        if (!validateRegistryFileName(item.name).ok) {
          console.warn(`Skipping contributor file ${blockchainName}/${chain_id}/${truncateForLog(item.name)}: disallowed name`)
          complete = false
          return false
        }
        return true
      })


      const contributors: ContributorData[] = []
      
      for (const file of contributorFiles) {
        try {
          const contributorData = await this.fetchFromGitHub(`chains/${blockchainName}/${chain_id}/${file.name}`)
          if (contributorData && this.isContributorData(contributorData)) {
            const checked = validateContributor(contributorData.contributor)
            if (!checked.ok) {
              console.warn(`Skipping contributor file ${blockchainName}/${chain_id}/${file.name}: ${checked.reason} ${truncateForLog(checked.value)}`)
              complete = false
              continue
            }
            for (const d of checked.dropped) {
              console.warn(`Dropped contributor field ${d.field} in ${blockchainName}/${chain_id}/${file.name}: ${d.reason} ${truncateForLog(d.value)}`)
            }
            if (!Array.isArray(contributorData.snapshots)) {
              console.warn(`Skipping contributor file ${blockchainName}/${chain_id}/${file.name}: snapshots is not an array`)
              complete = false
              continue
            }
            contributors.push({ contributor: checked.contributor, snapshots: contributorData.snapshots, registryPath: `chains/${blockchainName}/${chain_id}/${file.name}` })
          } else {
            complete = false
          }
        } catch (error) {
          complete = false
          console.error(`Failed to fetch contributor ${file.name}: ${describeError(error)}`)
        }
      }

      return { contributors, complete }
    } catch (error) {
      console.error(`Failed to fetch contributors for ${blockchainName}/${chain_id}:`, error)
      return { contributors: [], complete: false }
    }
  }

  private isContributorData(data: unknown): data is ContributorData {
    return (
      typeof data === 'object' && 
      data !== null &&
      'contributor' in data &&
      'snapshots' in data
    )
  }

  private isGitHubDirectoryResponse(data: unknown): data is GitHubDirectoryResponse {
    return Array.isArray(data) && data.every(item => 
      typeof item === 'object' && 
      item !== null && 
      'name' in item && 
      'type' in item
    )
  }

  private async getAllBlockchains(): Promise<string[]> {
    try {
      const contents = await this.fetchFromGitHub('chains')
      if (this.isGitHubDirectoryResponse(contents)) {
        const blockchains = contents
          .filter(item => item.type === 'dir')
          .map(item => item.name)
        return blockchains
      }
      return []
    } catch (error) {
      console.error('Failed to fetch blockchains list:', error)
      throw error
    }
  }

  private async getchain_ids(blockchainName: string): Promise<string[]> {
    try {
      const contents = await this.fetchFromGitHub(`chains/${blockchainName}`)
      if (this.isGitHubDirectoryResponse(contents)) {
        const chain_ids = contents
          .filter(item => item.type === 'dir')
          .map(item => item.name)
        return chain_ids
      }
      return []
    } catch (error) {
      console.error(`Failed to fetch chain IDs for ${blockchainName}:`, error)
      throw error
    }
  }

  async processAllSnapshotConfigurations(): Promise<{
    processedConfigurations: number
    availableConfigurations: number
    unavailableConfigurations: number
    errors: Array<{ configuration: string; error: string }>
  }> {
    try {
      console.log('Starting to process all snapshot configurations...')

      if (!this.config.token) {
        // Fails loudly and distinctly from "GitHub listing returned 0 configurations" below:
        // a 404 from GitHub (private repo, no/expired token) and a real 0-configurations repo
        // look identical once the request is made, so catch the cheap, unambiguous case - no
        // token at all - before any API call happens.
        throw new Error('GITHUB_TOKEN is not set - cannot authenticate to the registry repo')
      }

      const { configurations, discoveredChainNames, registry, protectedScopes } = await this.getAllSnapshotConfigurations()
      console.log(`Found ${configurations.length} snapshot configurations`)

      if (configurations.length === 0) {
        console.error('GitHub listing returned 0 configurations; aborting sync before any write or archive')
        throw new Error('GitHub listing returned 0 configurations; sync aborted without archiving')
      }

      const results = {
        processedConfigurations: 0,
        availableConfigurations: 0,
        unavailableConfigurations: 0,
        errors: [] as Array<{ configuration: string; error: string }>
      }

      const registryJoin = await this.resolveRegistryJoin(registry)

      const batchSize = 10
      for (let i = 0; i < configurations.length; i += batchSize) {
        const batch = configurations.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (config) => {
          try {
            await contributorService.upsertContributor({
              ...config.contributorData,
              registryAddedAt: registryJoin.get(config.contributorName)?.addedAt,
              registryAddedPaths: registryJoin.get(config.contributorName)?.paths
            })

            const dbConfig = await snapshotConfigurationService.upsertConfiguration({
              contributorName: config.contributorName,
              ...config.configuration
            })

            let latestSnapshot = null
            if (config.is_available && config.latestSnapshots && config.latestSnapshots.length > 0) {
              const latest = config.latestSnapshots[0]
              latestSnapshot = {
                filename: latest.filename,
                url: latest.url,
                size: latest.size,
                height: latest.height,
                creationDate: latest.creationDate
              }

              const snapshotsToStore = config.latestSnapshots.map(snapshot => ({
                block_height: snapshot.height,
                time: snapshot.creationDate.toISOString(),
                size: snapshot.size,
                download_url: snapshot.url,
                chain: {
                  name: config.configuration.chainName.charAt(0).toUpperCase() + config.configuration.chainName.slice(1),
                  display_name: config.configuration.chainName.charAt(0).toUpperCase() + config.configuration.chainName.slice(1),
                  image: `/${config.configuration.chainName}-logo.svg`
                },
                network: config.configuration.network,
                chain_id: config.configuration.chain_id,
                type: config.configuration.type || snapshot.type || 'unknown',
                contributor: {
                  name: config.contributorData.name,
                  image: contributorImage(config.contributorData.identity),
                  logoUrl: config.contributorData.logo_url || undefined,
                  website: config.contributorData.website || undefined,
                  description: config.contributorData.description || undefined,
                  email: config.contributorData.email || undefined,
                  discord: config.contributorData.discord || undefined,
                  telegram: config.contributorData.telegram || undefined,
                  x: config.contributorData.x || undefined,
                  identity: config.contributorData.identity || undefined
                },
                period: config.configuration.period || snapshot.period || 'unknown',
                tx_index: config.configuration.tx_index ? 'true' : 'false',
                configuration_id: dbConfig._id?.toString() || '',
                compression: snapshot.filename.endsWith('.lz4') ? 'lz4' : 
                            snapshot.filename.endsWith('.gz') ? 'gzip' :
                            snapshot.filename.endsWith('.tar.gz') ? 'gzip' : 'tar',
                filename: snapshot.filename,
                url: snapshot.url,
                checksum: snapshot.sha256sum ? { sha256: snapshot.sha256sum } : undefined
              }))

              try {
                const upsertResult = await snapshotDbService.bulkUpsertSnapshotInfos(snapshotsToStore)
                if (upsertResult.failed > 0) {
                  console.error(`${upsertResult.failed} snapshot(s) failed to store for ${config.contributorData.name}`)
                  results.errors.push({
                    configuration: `${config.contributorName} - ${config.configuration.chainName}/${config.configuration.chain_id}`,
                    error: `${upsertResult.failed} snapshot(s) failed to upsert: ${upsertResult.errors.map(e => e.error).join('; ')}`
                  })
                }
              } catch (snapshotError) {
                console.error(`Failed to store snapshots for ${config.contributorData.name}:`, snapshotError)
                results.errors.push({
                  configuration: `${config.contributorName} - ${config.configuration.chainName}/${config.configuration.chain_id}`,
                  error: snapshotError instanceof Error ? snapshotError.message : 'Failed to store snapshots'
                })
              }
            }

            await snapshotConfigurationService.updateConfigurationStatus(
              dbConfig._id?.toString() || '',
              config.is_available,
              latestSnapshot || undefined
            )

            await contributorService.updateContributorMetrics(config.contributorName)

            results.processedConfigurations++
            if (config.is_available) {
              results.availableConfigurations++
            } else {
              results.unavailableConfigurations++
            }

          } catch (error) {
            results.processedConfigurations++
            results.unavailableConfigurations++
            console.error(`Error processing configuration for ${config.contributorName}:`, error)
            results.errors.push({
              configuration: `${config.contributorName} - ${config.configuration.chainName}/${config.configuration.chain_id}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }))

        if (i + batchSize < configurations.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // After processing all configurations, mark any snapshots not in the current batch as outdated
      try {
        console.log('Archiving outdated snapshots...')
        const allCurrentSnapshots: SnapshotInfo[] = []
        
        for (const config of configurations) {
          if (config.is_available && config.latestSnapshots && config.latestSnapshots.length > 0) {
            const snapshotsToStore = config.latestSnapshots.map(snapshot => ({
              block_height: snapshot.height,
              time: snapshot.creationDate.toISOString(),
              size: snapshot.size,
              download_url: snapshot.url,
              chain: {
                name: config.configuration.chainName.charAt(0).toUpperCase() + config.configuration.chainName.slice(1),
                display_name: config.configuration.chainName.charAt(0).toUpperCase() + config.configuration.chainName.slice(1),
                image: `/${config.configuration.chainName}-logo.svg`
              },
              network: config.configuration.network,
              chain_id: config.configuration.chain_id,
              type: config.configuration.type || snapshot.type || 'unknown',
              contributor: {
                name: config.contributorData.name,
                image: contributorImage(config.contributorData.identity),
                logoUrl: config.contributorData.logo_url || undefined,
                website: config.contributorData.website || undefined,
                description: config.contributorData.description || undefined,
                email: config.contributorData.email || undefined,
                discord: config.contributorData.discord || undefined,
                telegram: config.contributorData.telegram || undefined,
                x: config.contributorData.x || undefined,
                identity: config.contributorData.identity || undefined
              },
              period: config.configuration.period || snapshot.period || 'unknown',
              tx_index: config.configuration.tx_index ? 'true' : 'false',
              compression: snapshot.filename.endsWith('.lz4') ? 'lz4' : 
                          snapshot.filename.endsWith('.gz') ? 'gzip' :
                          snapshot.filename.endsWith('.tar.gz') ? 'gzip' : 'tar',
              filename: snapshot.filename,
              url: snapshot.url,
              checksum: snapshot.sha256sum ? { sha256: snapshot.sha256sum } : undefined
            }))
            allCurrentSnapshots.push(...snapshotsToStore)
          }
        }
        
        // Only let the archiving sweep touch chains that were actually (re-)discovered this
        // run - a chain whose discovery failed this run is excluded here (see
        // getAllSnapshotConfigurations), so its existing is_current snapshots are left alone
        // instead of being wrongly marked outdated just because we failed to check them.
        const discoveredChainDisplayNames = Array.from(discoveredChainNames).map(blockchainDisplayName)

        const archivedCount = await snapshotDbService.markOutdatedSnapshotInfos(allCurrentSnapshots, discoveredChainDisplayNames, protectedScopes)
        console.log(`Archived ${archivedCount} outdated snapshots`)
      } catch (archiveError) {
        console.error('Failed to archive outdated snapshots:', archiveError)
      }

      console.log('Finished processing snapshot configurations:', results)
      return results

    } catch (error) {
      console.error('Failed to process snapshot configurations:', error)
      throw error
    }
  }

  private async getAllSnapshotConfigurations(): Promise<{
    configurations: SnapshotConfigurationInfo[]
    discoveredChainNames: Set<string>
    registry: RegistryRead
    protectedScopes: ProtectedScope[]
  }> {
    const configurations: SnapshotConfigurationInfo[] = []
    const registry: RegistryRead = { complete: true, pathsByName: new Map() }
    // Chains whose directory listing actually succeeded this run (as opposed to a chain that
    // was skipped because discovery failed) - used to scope the archiving pass so a transient
    // discovery failure doesn't get treated as "this chain's snapshots are all gone".
    const discoveredChainNames = new Set<string>()
    // Scopes where a registry read or a feed fetch failed this run. A failed read is no evidence
    // that anything was removed, so the archiving pass leaves their current snapshots current.
    const protectedScopes: ProtectedScope[] = []
    const displayName = blockchainDisplayName

    try {
      const blockchains = await this.getAllBlockchains()

      for (const blockchainName of blockchains) {
        if (!validateDirectoryName(blockchainName).ok) {
          console.warn(`Skipping chain directory ${truncateForLog(blockchainName)}: disallowed name`)
          registry.complete = false
          continue
        }
        let chain_ids: string[]
        try {
          chain_ids = await this.getchain_ids(blockchainName)
        } catch (error) {
          // Isolate a single chain's transient discovery failure (rate limit, 5xx, timeout) so
          // it doesn't abort the entire sync for every other chain. This chain gets 0
          // configurations this run, consistent with how a feed failure is already handled.
          // It's deliberately left out of discoveredChainNames too, so the archiving pass
          // below doesn't wipe its existing is_current snapshots just because we failed to
          // check them this run.
          console.error(`Skipping chain ${blockchainName}: discovery failed: ${describeError(error)}`)
          registry.complete = false
          continue
        }

        discoveredChainNames.add(blockchainName)

        for (const chain_id of chain_ids) {
          if (!validateDirectoryName(chain_id).ok) {
            console.warn(`Skipping chain_id directory ${blockchainName}/${truncateForLog(chain_id)}: disallowed name`)
            registry.complete = false
            continue
          }
          const network = classifyChainId(chain_id)
          if (!network) {
            registry.complete = false
            protectedScopes.push({ chainName: displayName(blockchainName), chainId: chain_id })
            continue
          }
          const read = await this.getContributors(blockchainName, chain_id)
          if (!read.complete) {
            registry.complete = false
            protectedScopes.push({ chainName: displayName(blockchainName), chainId: chain_id })
          }

          for (const contributorData of read.contributors) {
            const paths = registry.pathsByName.get(contributorData.contributor.name) ?? new Set<string>()
            paths.add(contributorData.registryPath)
            registry.pathsByName.set(contributorData.contributor.name, paths)

            for (const rawEndpoint of contributorData.snapshots) {
              const checkedEndpoint = validateSnapshotEndpoint(rawEndpoint)
              if (!checkedEndpoint.ok) {
                console.warn(`Skipping configuration of ${contributorData.contributor.name} for ${blockchainName}/${chain_id}: ${checkedEndpoint.reason} ${truncateForLog(rawEndpoint)}`)
                registry.complete = false
                protectedScopes.push({ chainName: displayName(blockchainName), chainId: chain_id, contributorName: contributorData.contributor.name })
                continue
              }
              const snapshotEndpoint = checkedEndpoint.value
              const configInfo: SnapshotConfigurationInfo = {
                contributorName: contributorData.contributor.name,
                contributorData: {
                  name: contributorData.contributor.name,
                  email: contributorData.contributor.email,
                  discord: contributorData.contributor.discord,
                  telegram: contributorData.contributor.telegram,
                  x: contributorData.contributor.x,
                  description: contributorData.contributor.description,
                  website: contributorData.contributor.website,
                  identity: contributorData.contributor.identity,
                  logo_url: contributorData.contributor.logoUrl
                },
                configuration: {
                  snapshotsJsonUrl: snapshotEndpoint.snapshots,
                  period: snapshotEndpoint.period || '',
                  type: snapshotEndpoint.type || '',
                  tx_index: String(snapshotEndpoint.tx_index) === 'true',
                  chainName: blockchainName,
                  chain_id: chain_id,
                  network
                },
                is_available: false,
                feed_read: false
              }

              try {
                const fetched = await this.fetchSnapshotsFromUrl(snapshotEndpoint.snapshots, snapshotEndpoint.type)
                const snapshots = fetched.snapshots

                if (snapshots && snapshots.length > 0) {
                  configInfo.is_available = true
                  
                  snapshots.sort((a, b) => {
                     const dateA = new Date(a.creation_date || a.time || 0).getTime() 
                     const dateB = new Date(b.creation_date || b.time || 0).getTime()
                     return dateB - dateA
                  })

                  const latest = snapshots[0]
                  if (!configInfo.configuration.period && latest.period) {
                     configInfo.configuration.period = latest.period
                  }
                  if (!configInfo.configuration.type && latest.type) {
                     configInfo.configuration.type = latest.type
                  }
                  if (snapshotEndpoint.tx_index === undefined && latest.tx_index !== undefined) {
                     configInfo.configuration.tx_index = String(latest.tx_index) === 'true'
                  }

                  if (snapshots.length > MAX_FEED_ENTRIES) {
                    console.warn(`Feed ${snapshotEndpoint.snapshots} has ${snapshots.length} valid entries; keeping the newest ${MAX_FEED_ENTRIES}`)
                    snapshots.splice(MAX_FEED_ENTRIES)
                  }

                  configInfo.latestSnapshots = snapshots.map(snapshot => {
                    const h = snapshot.latest_block_height || snapshot.block_height || snapshot.height || 0
                    const height = typeof h === 'string' ? parseInt(h, 10) : h
                    
                    const t = snapshot.creation_date || snapshot.time || new Date().toISOString()
                    const creationDate = new Date(t)
                    
                    const size = snapshot.size || '0GB'
                    
                    return {
                      filename: snapshot.filename || snapshot.url.split('/').pop() || 'unknown',
                      url: snapshot.url || snapshot.download_url || '',
                      size: size,
                      height: height,
                      creationDate: creationDate,
                      period: snapshot.period,
                      type: snapshot.type,
                      tx_index: snapshot.tx_index,
                      sha256sum: snapshot.sha256sum || snapshot.checksum?.sha256
                    }
                  })
                }
                // Set last: a feed counts as read only once it has been fully processed.
                configInfo.feed_read = fetched.read
              } catch (error) {
                configInfo.is_available = false
                configInfo.error = error instanceof Error ? error.message : 'Failed to fetch snapshots'
                console.warn(`Failed to fetch snapshots from ${snapshotEndpoint.snapshots}:`, error)
              }

              const unread = unreadFeedScope(configInfo.feed_read, {
                chainName: displayName(blockchainName),
                chainId: chain_id,
                contributorName: contributorData.contributor.name,
                type: snapshotEndpoint.type
              })
              if (unread) protectedScopes.push(unread)

              configurations.push(configInfo)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting snapshot configurations:', error)
      throw error
    }

    return { configurations, discoveredChainNames, registry, protectedScopes }
  }

  async getConfigurationDisplayData(): Promise<{
    totalConfigurations: number
    availableConfigurations: number
    contributors: Array<{
      name: string
      configurationsCount: number
      networksCount: number
      uptimePercentage: number
    }>
    chains: Array<{
      name: string
      configurationsCount: number
      availableCount: number
    }>
  }> {
    const configs = await snapshotConfigurationService.getAllActiveConfigurations()
    
    const contributorMap = new Map<string, {
      configurations: typeof configs
      networks: Set<string>
    }>()

    const chainMap = new Map<string, {
      total: number
      available: number
    }>()

    configs.forEach(config => {
      if (!contributorMap.has(config.contributorName)) {
        contributorMap.set(config.contributorName, {
          configurations: [],
          networks: new Set()
        })
      }
      const contributorData = contributorMap.get(config.contributorName)!
      contributorData.configurations.push(config)
      contributorData.networks.add(config.chainName)

      const chainKey = `${config.chainName}/${config.chain_id}`
      if (!chainMap.has(chainKey)) {
        chainMap.set(chainKey, { total: 0, available: 0 })
      }
      const chainData = chainMap.get(chainKey)!
      chainData.total++
      if (config.latestSnapshot) {
        chainData.available++
      }
    })

    const contributors = Array.from(contributorMap.entries()).map(([name, data]) => {
      const totalChecks = data.configurations.reduce((sum, config) => sum + config.uptimeChecks.totalChecks, 0)
      const successfulChecks = data.configurations.reduce((sum, config) => sum + config.uptimeChecks.successfulChecks, 0)
      const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0

      return {
        name,
        configurationsCount: data.configurations.length,
        networksCount: data.networks.size,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100
      }
    }).sort((a, b) => b.configurationsCount - a.configurationsCount)

    const chains = Array.from(chainMap.entries()).map(([chainKey, data]) => ({
      name: chainKey,
      configurationsCount: data.total,
      availableCount: data.available
    })).sort((a, b) => b.configurationsCount - a.configurationsCount)

    return {
      totalConfigurations: configs.length,
      availableConfigurations: configs.filter(c => c.latestSnapshot).length,
      contributors,
      chains
    }
  }
}

export const githubDataService = new GitHubDataService({
  owner: process.env.GITHUB_DATA_OWNER || 'denodesxyz',
  repo: process.env.GITHUB_DATA_REPO || 'snapsvault-registry',
  branch: process.env.GITHUB_DATA_BRANCH || 'main',
  token: process.env.GITHUB_TOKEN
})

export type { Contributor, SnapshotEndpoint, ContributorData }
