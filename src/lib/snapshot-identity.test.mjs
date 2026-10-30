// Run with: node --test src/lib/snapshot-identity.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { snapshotIdentityKey, snapshotUpsertFilter, currentSnapshotSet, outdatedFilter } from './snapshot-identity.ts'

const base = { chainName: 'Celestia', chainId: 'celestia', type: 'archive', contributorName: 'QubeLabs' }

function snap(over = {}) {
  return {
    chain: { name: 'Celestia' },
    chain_id: 'celestia',
    block_height: 0,
    type: 'archive',
    contributor: { name: 'QubeLabs' },
    time: '2026-10-01T00:00:00Z',
    url: 'https://snapshots.example.com/a.tar.lz4',
    ...over,
  }
}

test('a snapshot with a height is identified without its URL', () => {
  const a = snapshotIdentityKey({ ...base, type: 'pruned', blockHeight: 100, downloadUrl: 'https://x.example.com/a' })
  const b = snapshotIdentityKey({ ...base, type: 'pruned', blockHeight: 100, downloadUrl: 'https://x.example.com/b' })
  assert.equal(a, b)
  assert.equal(a, 'Celestia:celestia:100:pruned:QubeLabs')
})

test('a snapshot without a height gets one identity per file', () => {
  const a = snapshotIdentityKey({ ...base, blockHeight: 0, downloadUrl: 'https://x.example.com/a' })
  const b = snapshotIdentityKey({ ...base, blockHeight: 0, downloadUrl: 'https://x.example.com/b' })
  assert.notEqual(a, b)
})

test('the upsert filter adds the URL only when the height is 0', () => {
  assert.equal(snapshotUpsertFilter({ ...base, blockHeight: 0, downloadUrl: 'https://x.example.com/a' }).download_url, 'https://x.example.com/a')
  assert.equal('download_url' in snapshotUpsertFilter({ ...base, type: 'pruned', blockHeight: 5, downloadUrl: 'https://x.example.com/a' }), false)
})

test('of several files without a height only the newest is current', () => {
  const older = snap({ time: '2026-09-01T00:00:00Z', url: 'https://snapshots.example.com/old.tar.lz4' })
  const newer = snap({ time: '2026-10-01T00:00:00Z', url: 'https://snapshots.example.com/new.tar.lz4' })
  const current = currentSnapshotSet([older, newer])
  assert.equal(current.has(newer), true)
  assert.equal(current.has(older), false)
})

test('snapshots with a height are all current, and groups do not compete', () => {
  const p1 = snap({ type: 'pruned', block_height: 1 })
  const p2 = snap({ type: 'pruned', block_height: 2 })
  const otherContributor = snap({ contributor: { name: 'Other' }, time: '2020-01-01T00:00:00Z' })
  const mine = snap()
  const current = currentSnapshotSet([p1, p2, otherContributor, mine])
  assert.equal(current.size, 4)
})

test('the sweep filter keeps the URL in the key only for height 0', () => {
  const filter = outdatedFilter(['k'])
  const concat = filter.$expr.$not.$in[0].$concat
  assert.deepEqual(concat[concat.length - 1], { $cond: [{ $eq: ['$block_height', 0] }, { $concat: [':', '$download_url'] }, ''] })
  assert.deepEqual(filter.$expr.$not.$in[1], ['k'])
})

test('protected scopes are excluded from the sweep', () => {
  const filter = outdatedFilter([], ['Celestia'], [
    { chainName: 'Celestia', chainId: 'mocha-4' },
    { chainName: 'Celestia', chainId: 'celestia', contributorName: 'deNodes', type: 'pruned' },
  ])
  assert.deepEqual(filter.$nor, [
    { 'chain.name': 'Celestia', chain_id: 'mocha-4' },
    { 'chain.name': 'Celestia', chain_id: 'celestia', 'contributor.name': 'deNodes', type: 'pruned' },
  ])
  assert.equal('$nor' in outdatedFilter([], ['Celestia']), false)
})
