import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!process.env.MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    )
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Above the replica-set election window (~12 s), so a failover does not
      // fail the cron sync or its lock release; below the 30 s driver default.
      serverSelectionTimeoutMS: 15000,
    }

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then(() => mongoose)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectToDatabase
