import mongoose, { Schema, Document } from 'mongoose'

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60

export interface ISyncRun extends Document {
  started_at: Date
  finished_at: Date
  duration_ms: number
  ok: boolean
  feeds_total: number
  feeds_ok: number
  feeds_failed: number
  snapshots_current: number
}

const SyncRunSchema = new Schema<ISyncRun>({
  started_at: { type: Date, required: true, expires: NINETY_DAYS_SECONDS },
  finished_at: { type: Date, required: true },
  duration_ms: { type: Number, required: true },
  ok: { type: Boolean, required: true },
  feeds_total: { type: Number, required: true, default: 0 },
  feeds_ok: { type: Number, required: true, default: 0 },
  feeds_failed: { type: Number, required: true, default: 0 },
  snapshots_current: { type: Number, required: true, default: 0 }
}, { versionKey: false })

export const SyncRun = mongoose.models.SyncRun || mongoose.model<ISyncRun>('SyncRun', SyncRunSchema)
