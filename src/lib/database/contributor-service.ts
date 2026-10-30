import { Contributor, IContributor } from './models/contributor'
import { SnapshotConfiguration, ISnapshotConfiguration } from './models/snapshot-configuration'
import { Snapshot } from './models/snapshot'
import { connectToDatabase } from './connection'
import { registryProfile } from '../contributor-profile'
import { averagePeriodHours } from '../period-hours'
import { registryJoinUpdates, type RegistryJoinBasis } from '../registry-commits'

export class ContributorService {
  private async ensureConnection() {
    await connectToDatabase()
  }

  async upsertContributor(contributorData: {
    name: string
    email?: string
    discord?: string
    telegram?: string
    x?: string
    description?: string
    website?: string
    identity?: string
    logo_url?: string
    registryAddedAt?: Date | null
    registryAddedPaths?: string[]
  }): Promise<IContributor> {
    await this.ensureConnection()

    const existingContributor = await Contributor.findOne({ name: contributorData.name })
    
    if (existingContributor) {
      Object.assign(existingContributor, registryProfile(contributorData))

      const saved = await existingContributor.save()
      await this.applyRegistryJoin(contributorData)
      return saved
    } else {
      const newContributor = new Contributor({
        ...contributorData,
        registryAddedAt: null,
        registryAddedPaths: [],
        numberOfSnapshots: 0,
        networksCovered: [],
        snapshotFreshness: {
          periods: [],
          averagePeriodHours: null
        },
        uptimeAvailability: {
          totalChecks: 0,
          successfulChecks: 0,
          percentage: 0
        },
        totalScore: 0,
        scoreBreakdown: {
          providerSince: 0,
          numberOfSnapshots: 0,
          networksCovered: 0,
          snapshotFreshness: 0,
          uptimeAvailability: 0
        }
      })
      
      const created = await newContributor.save()
      await this.applyRegistryJoin(contributorData)
      return created
    }
  }

  // One atomic write, so concurrent upserts of one contributor never fail on a document version.
  private async applyRegistryJoin(data: { name: string; registryAddedAt?: Date | null; registryAddedPaths?: string[] }): Promise<void> {
    const updates = registryJoinUpdates(data.name, data.registryAddedAt, data.registryAddedPaths)
    if (!updates) return
    // Date first: a stored path list without a date is ignored by the resolver and looked up again.
    await Contributor.updateOne(updates.date.filter, updates.date.update)
    await Contributor.updateOne(updates.paths.filter, updates.paths.update)
  }

  async updateContributorMetrics(contributorName: string): Promise<void> {
    await this.ensureConnection()

    const contributor = await Contributor.findOne({ name: contributorName })
    if (!contributor) return

    const configurations = await SnapshotConfiguration.find({ 
      contributorName: contributorName,
      isActive: true 
    })

    const networksCovered = [...new Set(configurations.map((config: ISnapshotConfiguration) => config.chainName))]
    const periods = [...new Set(configurations.map((config: ISnapshotConfiguration) => config.period))].filter(Boolean) as string[]
    
    const averageHours = averagePeriodHours(periods)
    
    const totalChecks = configurations.reduce((sum: number, config: ISnapshotConfiguration) => sum + config.uptimeChecks.totalChecks, 0)
    const successfulChecks = configurations.reduce((sum: number, config: ISnapshotConfiguration) => sum + config.uptimeChecks.successfulChecks, 0)
    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0

    contributor.networksCovered = networksCovered
    contributor.snapshotFreshness.periods = periods
    contributor.snapshotFreshness.averagePeriodHours = averageHours
    contributor.uptimeAvailability.totalChecks = totalChecks
    contributor.uptimeAvailability.successfulChecks = successfulChecks
    contributor.uptimeAvailability.percentage = uptimePercentage
    contributor.uptimeAvailability.lastChecked = new Date()

    const snapshotCounts = await this.countCurrentSnapshots([contributorName])
    contributor.numberOfSnapshots = snapshotCounts.get(contributorName) ?? 0

    const scoreBreakdown = this.calculateScoreBreakdown(contributor)
    contributor.scoreBreakdown = scoreBreakdown
    contributor.totalScore = scoreBreakdown.providerSince + scoreBreakdown.numberOfSnapshots + 
                            scoreBreakdown.networksCovered + scoreBreakdown.snapshotFreshness + 
                            scoreBreakdown.uptimeAvailability

    // $set of the computed fields only: a whole-document save would version-check the arrays
    // against concurrent runs for the same contributor.
    const plain = contributor.toObject()
    await Contributor.updateOne({ name: contributorName }, {
      $set: {
        networksCovered: plain.networksCovered,
        snapshotFreshness: plain.snapshotFreshness,
        uptimeAvailability: plain.uptimeAvailability,
        numberOfSnapshots: plain.numberOfSnapshots,
        scoreBreakdown: plain.scoreBreakdown,
        totalScore: plain.totalScore
      }
    })
  }

  private calculateScoreBreakdown(contributor: IContributor): IContributor['scoreBreakdown'] {
    const now = new Date()
    const daysSinceProvider = contributor.registryAddedAt
      ? Math.floor((now.getTime() - contributor.registryAddedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const providerSinceScore = Math.min(20, daysSinceProvider / 30)
    
    const snapshotScore = Math.min(20, Math.log10(contributor.numberOfSnapshots + 1) * 5)
    
    const networksScore = Math.min(15, contributor.networksCovered.length * 2.5)
    
    const maxHours = 168
    const averageHours = contributor.snapshotFreshness.averagePeriodHours
    const freshnessScore = averageHours != null && averageHours > 0
      ? Math.max(0, 25 - (averageHours / maxHours) * 25)
      : 0
    
    const uptimeScore = (contributor.uptimeAvailability.percentage / 100) * 20

    return {
      providerSince: Math.round(providerSinceScore * 10) / 10,
      numberOfSnapshots: Math.round(snapshotScore * 10) / 10,
      networksCovered: Math.round(networksScore * 10) / 10,
      snapshotFreshness: Math.round(freshnessScore * 10) / 10,
      uptimeAvailability: Math.round(uptimeScore * 10) / 10
    }
  }

  async getTopContributors(limit: number = 10): Promise<IContributor[]> {
    await this.ensureConnection()
    
    return await Contributor.find({})
      .sort({ totalScore: -1 })
      .limit(limit)
      .exec()
  }

  async listContributors(limit: number = 10): Promise<IContributor[]> {
    await this.ensureConnection()

    return await Contributor.find({})
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 })
      .limit(limit)
      .exec()
  }

  async getRegistryJoinByNames(names: string[]): Promise<Map<string, RegistryJoinBasis>> {
    await this.ensureConnection()
    const rows = await Contributor.find({ name: { $in: names } }).select('name registryAddedAt registryAddedPaths').lean<Array<{ name: string; registryAddedAt?: Date | null; registryAddedPaths?: string[] }>>()
    return new Map(rows.map(row => [row.name, { addedAt: row.registryAddedAt ?? null, paths: row.registryAddedPaths ?? [] }]))
  }

  async getContributorByName(name: string): Promise<IContributor | null> {
    await this.ensureConnection()
    return await Contributor.findOne({ name })
  }

  // Current snapshots per contributor name, counted from the snapshots collection. The API
  // number_of_snapshots and the score (numberOfSnapshots, totalScore) use this same count.
  async countCurrentSnapshots(names: string[]): Promise<Map<string, number>> {
    await this.ensureConnection()
    const rows = await Snapshot.aggregate<{ _id: string; count: number }>([
      { $match: { is_current: true, last_seen: { $exists: true, $ne: null }, 'contributor.name': { $in: names } } },
      { $group: { _id: '$contributor.name', count: { $sum: 1 } } }
    ])
    return new Map(rows.map(row => [row._id, row.count]))
  }

  async getContributorsByNames(names: string[]): Promise<IContributor[]> {
    await this.ensureConnection()
    return await Contributor.find({ name: { $in: names } }).lean<IContributor[]>()
  }
}

export const contributorService = new ContributorService()
