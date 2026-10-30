import mongoose, { Schema, Document } from 'mongoose'

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60

const UPTIME_COMPONENTS = ['website', 'api', 'sync', 'database', 'docs', 'landing'] as const
export type UptimeComponent = typeof UPTIME_COMPONENTS[number]

// Written by the external monitor, read by the status page.
export interface IUptimeCheck extends Document {
  at: Date
  component: UptimeComponent
  ok: boolean
  latency_ms?: number
}

const UptimeCheckSchema = new Schema<IUptimeCheck>({
  at: { type: Date, required: true, expires: NINETY_DAYS_SECONDS },
  component: { type: String, required: true, enum: UPTIME_COMPONENTS },
  ok: { type: Boolean, required: true },
  latency_ms: { type: Number }
}, { versionKey: false })

UptimeCheckSchema.index({ component: 1, at: -1 })

export const UptimeCheck = mongoose.models.UptimeCheck || mongoose.model<IUptimeCheck>('UptimeCheck', UptimeCheckSchema)
