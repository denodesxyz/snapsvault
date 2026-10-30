// Run with: node --test src/lib/settle.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settle } from './settle.ts'
import { buildStatus } from './status-model.ts'

const NOW = Date.parse('2026-10-19T18:00:00Z')

test('a fulfilled read passes its value through', async () => {
  assert.deepEqual(await settle(Promise.resolve([1]), []), { value: [1], failed: false })
})

test('a rejected read becomes the fallback and is flagged', async () => {
  assert.deepEqual(await settle(Promise.reject(new Error('MaxTimeMSExpired')), []), { value: [], failed: true })
})

test('core feed rows still build when every optional read failed', async () => {
  const histories = await settle(Promise.reject(new Error('x')), undefined)
  const daily = await settle(Promise.reject(new Error('x')), undefined)
  const config = {
    contributorName: 'deNodes', chainName: 'celestia', chain_id: 'celestia', type: 'pruned', period: '4h',
    consecutiveFailures: 0, lastSuccessfulFetch: new Date(NOW - 60_000), lastFailedFetch: null,
  }
  const snap = { contributorName: 'deNodes', chainName: 'Celestia', chain_id: 'celestia', type: 'pruned', time: new Date(NOW - 3_600_000) }
  const s = buildStatus([config], [snap], NOW, { histories: histories.value, dailyRows: daily.value })
  assert.equal(s.rows.length, 1)
  assert.equal(s.rows[0].status, 'ok')
  assert.equal(s.rows[0].snapshotsAllTime, 0)
  assert.equal(s.totals.snapshotsCurrent, 1)
})
