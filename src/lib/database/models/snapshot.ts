import mongoose, { Schema, Document } from 'mongoose'

export interface IContributor {
  name: string
  image: string
  logo_url?: string
  website?: string
  description?: string
  email?: string
  discord?: string
  telegram?: string
  x?: string
  identity?: string
}

export interface IChain {
  name: string
  display_name: string
  image: string
}

export interface IChecksum {
  sha256?: string
  md5?: string
}

export interface ISnapshot extends Document {
  block_height: number
  time: Date
  size: string
  download_url: string
  
  chain: IChain
  network: string
  chain_id: string
  type: string
  
  contributor: IContributor
  
  period: string
  tx_index: string
  checksum?: IChecksum
  compression?: string
  instructions?: string
  
  configuration_id: string
  
  first_seen: Date
  last_seen: Date
  is_current: boolean
  
  github_url?: string
  github_file_sha?: string
  history_import?: string
  
  created_at: Date
  updated_at: Date
}

const ContributorSchema = new Schema<IContributor>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  logo_url: { type: String },
  website: { type: String },
  description: { type: String },
  email: { type: String },
  discord: { type: String },
  telegram: { type: String },
  x: { type: String },
  identity: { type: String }
})

const ChainSchema = new Schema<IChain>({
  name: { type: String, required: true },
  display_name: { type: String, required: true },
  image: { type: String, required: true }
})

const ChecksumSchema = new Schema<IChecksum>({
  sha256: { type: String },
  md5: { type: String }
})

const SnapshotSchema = new Schema<ISnapshot>({
  block_height: { type: Number, required: true, index: true },
  time: { type: Date, required: true, index: true },
  size: { type: String, required: true },
  download_url: { type: String, required: true },
  
  chain: { type: ChainSchema, required: true },
  network: { type: String, required: true, index: true },
  chain_id: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  
  contributor: { type: ContributorSchema, required: true },
  
  period: { type: String, required: true },
  tx_index: { type: String, required: true },
  checksum: { type: ChecksumSchema },
  compression: { type: String },
  instructions: { type: String },
  
  configuration_id: { type: String, required: true, index: true },
  
  first_seen: { type: Date, required: true, default: Date.now },
  last_seen: { type: Date, required: true, default: Date.now },
  is_current: { type: Boolean, required: true, default: true, index: true },
  
  github_url: { type: String },
  github_file_sha: { type: String },
  history_import: { type: String },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

SnapshotSchema.index({ 'chain.name': 1, chain_id: 1, 'contributor.name': 1 })
SnapshotSchema.index({ is_current: 1, time: -1 })
SnapshotSchema.index({ 'chain.name': 1, network: 1, type: 1 })
SnapshotSchema.index({ block_height: -1, time: -1 })
SnapshotSchema.index({ 'contributor.name': 1, time: -1 })
SnapshotSchema.index({ download_url: 1, time: -1 })

// The identity of a snapshot: the business key every write path uses to find and update a document.
// A snapshot without a published height (block_height 0) has no height to tell files apart, so its
// download URL is part of the key. Partial indexes keep the two rules apart.
// For an existing database, scripts/migrate-archive-identity.mjs brings the indexes in line.
SnapshotSchema.index(
  {
    'chain.name': 1,
    chain_id: 1,
    type: 1,
    'contributor.name': 1,
    block_height: 1
  },
  { unique: true, name: 'identity_height', partialFilterExpression: { block_height: { $gt: 0 } } }
)
SnapshotSchema.index(
  {
    'chain.name': 1,
    chain_id: 1,
    type: 1,
    'contributor.name': 1,
    download_url: 1
  },
  { unique: true, name: 'identity_no_height', partialFilterExpression: { block_height: 0 } }
)

SnapshotSchema.pre<ISnapshot>('save', function(next: () => void) {
  this.updated_at = new Date()
  if (this.isNew) {
    this.created_at = new Date()
  }
  next()
})

export const Snapshot = mongoose.models.Snapshot || mongoose.model<ISnapshot>('Snapshot', SnapshotSchema)
