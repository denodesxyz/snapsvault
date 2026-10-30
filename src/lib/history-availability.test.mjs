// Run with: node --test src/lib/history-availability.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isUrlReused } from './history-availability.ts'

const LATEST = 'https://snapshots.kjnodes.com/celestia/snapshot_latest.tar.lz4'
const t = iso => Date.parse(iso)

test('a past snapshot whose URL a newer snapshot reuses is not available', () => {
  const newest = new Map([[LATEST, t('2026-10-21T12:00:00Z')]])
  assert.equal(isUrlReused({ download_url: LATEST, time: new Date('2026-10-20T13:06:00Z'), is_current: false }, newest), true)
})

test('the current snapshot keeps its flag', () => {
  const newest = new Map([[LATEST, t('2026-10-21T12:00:00Z')]])
  assert.equal(isUrlReused({ download_url: LATEST, time: '2026-10-21T12:00:00Z', is_current: true }, newest), false)
})

test('history with its own URL or no newer snapshot keeps its flag', () => {
  const own = 'https://snapshots.example.com/celestia/celestia-15127966.tar.lz4'
  const newest = new Map([[own, t('2026-10-20T13:06:00Z')], [LATEST, t('2026-10-21T12:00:00Z')]])
  assert.equal(isUrlReused({ download_url: own, time: '2026-10-20T13:06:00Z', is_current: false }, newest), false)
  assert.equal(isUrlReused({ download_url: 'https://other.example.com/a.tar.lz4', time: '2026-10-20T13:06:00Z', is_current: false }, newest), false)
  assert.equal(isUrlReused({ download_url: LATEST, time: '2026-10-21T12:00:00Z', is_current: false }, newest), false)
})
