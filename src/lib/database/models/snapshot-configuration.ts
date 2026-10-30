import mongoose, { Document, Schema } from 'mongoose'

export interface ISnapshotConfiguration extends Document {
  contributorName: string
  snapshotsJsonUrl: string
  period: string
  type: string
  tx_index: boolean
  
  chainName: string
  chain_id: string
  network: string
  
  isActive: boolean
  lastSuccessfulFetch: Date | null
  lastFailedFetch: Date | null
  consecutiveFailures: number
  uptimeChecks: {
    totalChecks: number
    successfulChecks: number
  }
  
  latestSnapshot: {
    filename?: string
    url?: string
    size?: string | number
    height?: number
    creationDate?: Date
  } | null
  
  createdAt: Date
  updatedAt: Date
}

const SnapshotConfigurationSchema = new Schema<ISnapshotConfiguration>({
  contributorName: { type: String, required: true },
  snapshotsJsonUrl: { type: String, required: true },
  period: { type: String, required: false, default: '' },
  type: { type: String, required: false, default: '' },
  tx_index: { type: Boolean, required: true },
  
  chainName: { type: String, required: true },
  chain_id: { type: String, required: true },
  network: { type: String, required: true },
  
  isActive: { type: Boolean, default: true },
  lastSuccessfulFetch: Date,
  lastFailedFetch: Date,
  consecutiveFailures: { type: Number, default: 0 },
  uptimeChecks: {
    totalChecks: { type: Number, default: 0 },
    successfulChecks: { type: Number, default: 0 }
  },
  
  latestSnapshot: {
    filename: String,
    url: String,
    size: String,
    height: Number,
    creationDate: Date
  }
}, {
  timestamps: true
})

SnapshotConfigurationSchema.index({ 
  contributorName: 1, 
  chainName: 1, 
  chain_id: 1, 
  type: 1 
}, { unique: true })

SnapshotConfigurationSchema.index({ chainName: 1, chain_id: 1 })
SnapshotConfigurationSchema.index({ contributorName: 1 })
SnapshotConfigurationSchema.index({ isActive: 1 })

export const SnapshotConfiguration = mongoose.models.SnapshotConfiguration || 
  mongoose.model<ISnapshotConfiguration>('SnapshotConfiguration', SnapshotConfigurationSchema)
