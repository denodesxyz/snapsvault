import mongoose, { Schema, Document } from 'mongoose'

// Single-document mutex + a tiny bit of cross-instance config for the snapshot sync pipeline.
// This is intentionally minimal: a mutex, not an audit log.
export interface ISyncLock extends Document<string> {
  _id: string
  lockedAt: Date | null
  lockedBy: string | null
  enabled: boolean
}

const SyncLockSchema = new Schema<ISyncLock>({
  _id: { type: String, required: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: null },
  enabled: { type: Boolean, default: true }
}, { versionKey: false })

export const SyncLock = mongoose.models.SyncLock || mongoose.model<ISyncLock>('SyncLock', SyncLockSchema)
