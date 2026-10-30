import { SnapshotConfiguration, ISnapshotConfiguration } from './models/snapshot-configuration'
import { contributorService } from './contributor-service'
import { connectToDatabase } from './connection'

export class SnapshotConfigurationService {
  private async ensureConnection() {
    await connectToDatabase()
  }

  async upsertConfiguration(configData: {
    contributorName: string
    snapshotsJsonUrl: string
    period: string
    type: string
    tx_index: boolean
    chainName: string
    chain_id: string
    network: string
  }): Promise<ISnapshotConfiguration> {
    await this.ensureConnection()

    // Validate required fields - reject empty strings or invalid values
    if (!configData.chain_id || configData.chain_id.trim() === '' || configData.chain_id === 'undefined') {
      throw new Error(`Invalid chain_id: "${configData.chain_id}" for ${configData.contributorName} - ${configData.chainName}`)
    }
    
    if (!configData.chainName || configData.chainName.trim() === '') {
      throw new Error(`Invalid chainName for ${configData.contributorName}`)
    }

    // A transient feed failure resolves type to '' (see CONTRIBUTOR-CONTRACT.md). type is part
    // of the upsert identity below, so letting '' through as-is would spawn a permanent duplicate
    // "ghost" configuration every time the feed happens to fail. If exactly one configuration
    // already exists for this contributor/chain/chain_id and it has a real type, reuse that type
    // instead - it's almost certainly the same configuration, just mid-failure. Skip the reuse
    // when more than one exists: that's a contributor legitimately running multiple types (e.g.
    // pruned and archive) for the same chain_id, and there's no way to tell which one a blank
    // result belongs to.
    let type = configData.type
    if (type === '') {
      const existing = await SnapshotConfiguration.find({
        contributorName: configData.contributorName,
        chainName: configData.chainName,
        chain_id: configData.chain_id
      })
      if (existing.length === 1 && existing[0].type !== '') {
        type = existing[0].type
      }
    }

    const filter = {
      contributorName: configData.contributorName,
      chainName: configData.chainName,
      chain_id: configData.chain_id,
      type
    }

    const update = {
      ...configData,
      type,
      isActive: true,
      $inc: { 'uptimeChecks.totalChecks': 0 }
    }

    const config = await SnapshotConfiguration.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return config
  }

  async updateConfigurationStatus(
    configId: string, 
    success: boolean, 
    latestSnapshot?: {
      filename: string
      url: string
      size: string | number
      height: number
      creationDate: Date
    }
  ): Promise<void> {
    await this.ensureConnection()

    const config = await SnapshotConfiguration.findById(configId)
    if (!config) return

    config.uptimeChecks.totalChecks += 1
    
    if (success) {
      config.lastSuccessfulFetch = new Date()
      config.consecutiveFailures = 0
      config.uptimeChecks.successfulChecks += 1
      
      if (latestSnapshot) {
        config.latestSnapshot = latestSnapshot
      }
    } else {
      config.lastFailedFetch = new Date()
      config.consecutiveFailures += 1
      
      if (config.consecutiveFailures >= 10) {
        config.isActive = false
      }
    }

    await config.save()

    await contributorService.updateContributorMetrics(config.contributorName)
  }

  async getConfigurationsByContributor(contributorName: string): Promise<ISnapshotConfiguration[]> {
    await this.ensureConnection()
    
    return await SnapshotConfiguration.find({ 
      contributorName,
      isActive: true 
    }).sort({ updatedAt: -1 })
  }

  async getConfigurationsByChain(chainName: string, chain_id: string): Promise<ISnapshotConfiguration[]> {
    await this.ensureConnection()
    
    return await SnapshotConfiguration.find({ 
      chainName,
      chain_id,
      isActive: true 
    }).sort({ 'latestSnapshot.creationDate': -1 })
  }

  async getAllActiveConfigurations(): Promise<ISnapshotConfiguration[]> {
    await this.ensureConnection()
    
    return await SnapshotConfiguration.find({ isActive: true })
  }

  async getConfigurationStats(): Promise<{
    totalConfigurations: number
    activeConfigurations: number
    configurationsByChain: Array<{ chainName: string; count: number }>
    configurationsByContributor: Array<{ contributorName: string; count: number }>
    uptimeStats: {
      averageUptime: number
      configurationsWithIssues: number
    }
  }> {
    await this.ensureConnection()

    const [
      totalConfigurations,
      activeConfigurations,
      chainStats,
      contributorStats,
      uptimeData
    ] = await Promise.all([
      SnapshotConfiguration.countDocuments({}),
      SnapshotConfiguration.countDocuments({ isActive: true }),
      SnapshotConfiguration.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$chainName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      SnapshotConfiguration.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$contributorName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      SnapshotConfiguration.find({ isActive: true }, 'uptimeChecks consecutiveFailures')
    ])

    const uptimePercentages = uptimeData
      .filter(config => config.uptimeChecks.totalChecks > 0)
      .map(config => (config.uptimeChecks.successfulChecks / config.uptimeChecks.totalChecks) * 100)
    
    const averageUptime = uptimePercentages.length > 0 
      ? uptimePercentages.reduce((sum, pct) => sum + pct, 0) / uptimePercentages.length 
      : 0

    const configurationsWithIssues = uptimeData.filter(config => config.consecutiveFailures > 0).length

    return {
      totalConfigurations,
      activeConfigurations,
      configurationsByChain: chainStats.map(item => ({
        chainName: item._id,
        count: item.count
      })),
      configurationsByContributor: contributorStats.map(item => ({
        contributorName: item._id,
        count: item.count
      })),
      uptimeStats: {
        averageUptime: Math.round(averageUptime * 100) / 100,
        configurationsWithIssues
      }
    }
  }
}

export const snapshotConfigurationService = new SnapshotConfigurationService()
