// Run with: node --test src/lib/validation/feed.test.mjs
// Covers the block height rule: only an archive snapshot may have height 0 or no height.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSnapshotEntry, applyHeightRule, checkHeightZero, feedEffectiveType, assertStorableHeight } from './feed.ts'

const NOW = Date.parse('2026-10-19T18:00:00Z')

function entry(over = {}) {
  return {
    url: 'https://snapshots.example.com/celestia/snapshot.tar.lz4',
    size: '3.7GB',
    creation_date: '2026-10-19T12:00:00Z',
    latest_block_height: 15099873,
    ...over,
  }
}

// Runs the function the sync uses: validate the entry, then apply the height rule.
function check(raw, registryType) {
  const r = validateSnapshotEntry(raw, NOW)
  assert.equal(r.ok, true)
  const { kept, rejected } = applyHeightRule(registryType, [{ index: 0, entry: r.entry }])
  return kept.length ? { ok: true } : { ok: false, reason: rejected[0].reason }
}

test('pruned entry without a height is rejected', () => {
  const r = check(entry({ type: 'pruned', latest_block_height: undefined }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /has no latest_block_height/)
})

test('pruned entry with height "0" is rejected', () => {
  assert.equal(check(entry({ type: 'pruned', latest_block_height: '0' })).ok, false)
})

test('pruned entry with height 0 is rejected', () => {
  const r = check(entry({ type: 'pruned', latest_block_height: 0 }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /latest_block_height is 0 but the snapshot type is "pruned"/)
})

test('archive entry without a height is ok', () => {
  assert.equal(check(entry({ type: 'archive', latest_block_height: undefined })).ok, true)
})

test('archive entry with height 0 is ok', () => {
  assert.equal(check(entry({ type: 'archive', latest_block_height: 0 })).ok, true)
})

test('pruned entry with height 5 is ok', () => {
  assert.equal(check(entry({ type: 'pruned', latest_block_height: 5 })).ok, true)
})

test('registry type archive wins over an entry type pruned', () => {
  assert.equal(check(entry({ type: 'pruned', latest_block_height: 0 }), 'archive').ok, true)
})

test('registry type pruned wins over an entry type archive', () => {
  assert.equal(check(entry({ type: 'archive', latest_block_height: 0 }), 'pruned').ok, false)
})

test('no type anywhere counts as not archive', () => {
  const r = check(entry({ latest_block_height: 0 }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /type is not set/)
})

test('without a registry type the newest entry type applies to every entry', () => {
  const older = validateSnapshotEntry(entry({ type: 'pruned', creation_date: '2026-10-01T00:00:00Z', latest_block_height: 0 }), NOW).entry
  const newest = validateSnapshotEntry(entry({ type: 'archive', creation_date: '2026-10-10T00:00:00Z' }), NOW).entry
  assert.equal(feedEffectiveType(undefined, [older, newest]), 'archive')
  assert.equal(feedEffectiveType('pruned', [older, newest]), 'pruned')
  assert.equal(checkHeightZero(older, 'archive').ok, true)
})

test('a write is refused for height 0 or a bad height unless the type is exactly archive', () => {
  assert.throws(() => assertStorableHeight('pruned', 0), /height 0 is allowed only for type "archive"/)
  assert.throws(() => assertStorableHeight('', 0))
  assert.throws(() => assertStorableHeight('Archive', 0))
  assert.throws(() => assertStorableHeight('pruned', undefined))
  assert.throws(() => assertStorableHeight('pruned', 1.5))
  assert.throws(() => assertStorableHeight('pruned', -3))
  assert.doesNotThrow(() => assertStorableHeight('pruned', 15127966))
  assert.doesNotThrow(() => assertStorableHeight('archive', 0))
})

import { readCappedBytes } from './feed.ts'

test('a body above the cap is refused while streaming, and one within it is returned', async () => {
  const body = new Uint8Array(2000).fill(1)
  await assert.rejects(() => readCappedBytes(new Response(body), 1000), /exceeds 1000 bytes/)
  assert.equal((await readCappedBytes(new Response(body), 2000)).byteLength, 2000)
})

test('a declared length above the cap is refused before reading', async () => {
  const response = new Response('x', { headers: { 'content-length': '5000' } })
  await assert.rejects(() => readCappedBytes(response, 1000), /Content-Length 5000 exceeds 1000 bytes/)
})
