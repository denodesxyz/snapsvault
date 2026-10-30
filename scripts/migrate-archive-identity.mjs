#!/usr/bin/env node
// Moves the snapshots collection to the archive identity: a snapshot without a published height
// (block_height 0) is identified by its download URL as well, so several archive files of one
// contributor are stored side by side. No document is changed, moved or deleted.
//
// Dry run (default): prints what it would do.   MONGODB_URI=<uri> node scripts/migrate-archive-identity.mjs
// Apply:                                         MONGODB_URI=<uri> node scripts/migrate-archive-identity.mjs --apply
//
// Steps: create the two new unique partial indexes, then drop the old unique index, and only when
// both new indexes exist. Safe to run again; a finished migration reports nothing to do.

import mongoose from 'mongoose'

const apply = process.argv.includes('--apply')
const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('usage: MONGODB_URI=<uri> node scripts/migrate-archive-identity.mjs [--apply]')
  process.exit(2)
}

const OLD_KEY = { 'chain.name': 1, chain_id: 1, block_height: 1, type: 1, 'contributor.name': 1 }
const NEW_INDEXES = [
  {
    key: { 'chain.name': 1, chain_id: 1, type: 1, 'contributor.name': 1, block_height: 1 },
    options: { unique: true, name: 'identity_height', partialFilterExpression: { block_height: { $gt: 0 } } }
  },
  {
    key: { 'chain.name': 1, chain_id: 1, type: 1, 'contributor.name': 1, download_url: 1 },
    options: { unique: true, name: 'identity_no_height', partialFilterExpression: { block_height: 0 } }
  }
]

function sameKey(a, b) {
  return JSON.stringify(Object.entries(a)) === JSON.stringify(Object.entries(b))
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
try {
  const collection = mongoose.connection.db.collection('snapshots')
  const indexes = await collection.indexes()
  const oldIndex = indexes.find(i => i.unique && !i.partialFilterExpression && sameKey(i.key, OLD_KEY))
  const missing = NEW_INDEXES.filter(n => !indexes.some(i => i.name === n.options.name))

  console.log(`mode: ${apply ? 'apply' : 'dry run'}`)
  console.log(`old unique index: ${oldIndex ? oldIndex.name : 'not present'}`)
  console.log(`new indexes to create: ${missing.length ? missing.map(n => n.options.name).join(', ') : 'none'}`)

  if (!oldIndex && missing.length === 0) {
    console.log('nothing to do')
  } else if (!apply) {
    for (const n of missing) console.log(`would create index ${n.options.name}`)
    if (oldIndex) console.log(`would drop index ${oldIndex.name} after both new indexes exist`)
    console.log('dry run only, no change made; rerun with --apply')
  } else {
    for (const n of missing) {
      await collection.createIndex(n.key, n.options)
      console.log(`created index ${n.options.name}`)
    }
    const after = await collection.indexes()
    const ready = NEW_INDEXES.every(n => after.some(i => i.name === n.options.name))
    if (!ready) {
      console.error('a new index is missing; the old index is left in place')
      process.exitCode = 1
    } else if (oldIndex) {
      await collection.dropIndex(oldIndex.name)
      console.log(`dropped index ${oldIndex.name}`)
    }
  }
} finally {
  await mongoose.disconnect()
}
