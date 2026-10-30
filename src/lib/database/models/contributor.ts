import mongoose, { Document, Schema } from 'mongoose'

export interface IContributor extends Document {
  name: string
  email?: string
  discord?: string
  telegram?: string
  x?: string
  description?: string
  website?: string
  identity?: string
  logo_url?: string

  registryAddedAt: Date | null
  registryAddedPaths: string[]
  numberOfSnapshots: number
  networksCovered: string[]
  snapshotFreshness: {
    periods: string[]
    averagePeriodHours: number | null
  }
  uptimeAvailability: {
    totalChecks: number
    successfulChecks: number
    percentage: number
    lastChecked: Date
  }
  
  totalScore: number
  scoreBreakdown: {
    providerSince: number
    numberOfSnapshots: number
    networksCovered: number
    snapshotFreshness: number
    uptimeAvailability: number
  }
  
  createdAt: Date
  updatedAt: Date
}

const ContributorSchema = new Schema<IContributor>({
  name: { type: String, required: true, unique: true },
  email: String,
  discord: String,
  telegram: String,
  x: String,
  description: String,
  website: String,
  identity: String,
  logo_url: String,
  
  registryAddedAt: { type: Date, default: null },
  registryAddedPaths: [String],
  numberOfSnapshots: { type: Number, default: 0 },
  networksCovered: [String],
  snapshotFreshness: {
    periods: [String],
    averagePeriodHours: { type: Number, default: null }
  },
  uptimeAvailability: {
    totalChecks: { type: Number, default: 0 },
    successfulChecks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    lastChecked: Date
  },
  
  totalScore: { type: Number, default: 0 },
  scoreBreakdown: {
    providerSince: { type: Number, default: 0 },
    numberOfSnapshots: { type: Number, default: 0 },
    networksCovered: { type: Number, default: 0 },
    snapshotFreshness: { type: Number, default: 0 },
    uptimeAvailability: { type: Number, default: 0 }
  }
}, {
  timestamps: true
})

ContributorSchema.index({ totalScore: -1 })
ContributorSchema.index({ networksCovered: 1 })

export const Contributor = mongoose.models.Contributor || mongoose.model<IContributor>('Contributor', ContributorSchema)
