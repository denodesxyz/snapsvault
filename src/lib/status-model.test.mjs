// Run with: node --test src/lib/status-model.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildStatus, buildDailyNew, thin, medianIntervalHours, passesHeightRule, periodMs, staleAfterMs } from './status-model.ts'

const NOW = Date.parse('2026-10-19T18:00:00Z')
const H = 60 * 60 * 1000

function config(over = {}) {
  return {
    contributorName: 'deNodes',
    chainName: 'celestia',
    chain_id: 'celestia',
    type: 'pruned',
    period: '4h',
    consecutiveFailures: 0,
    lastSuccessfulFetch: new Date(NOW - 60_000),
    lastFailedFetch: null,
    ...over,
  }
}

function snap(over = {}) {
  return { contributorName: 'deNodes', chainName: 'Celestia', chain_id: 'celestia', type: 'pruned', time: new Date(NOW - 2 * H), ...over }
}

test('periods parse and set the stale window', () => {
  assert.equal(periodMs('4h'), 4 * H)
  assert.equal(periodMs('1d'), 24 * H)
  assert.equal(periodMs('1w'), 168 * H)
  assert.equal(periodMs(''), null)
  assert.equal(periodMs('0h'), null)
  assert.equal(staleAfterMs('6h'), 12 * H)
  assert.equal(staleAfterMs(''), null)
  assert.equal(staleAfterMs('weekly'), null)
})

test('a feed without a declared period is never stale, however old its newest snapshot', () => {
  const old = [snap({ type: 'archive', time: new Date(NOW - 45 * 24 * H) })]
  for (const period of ['', '  ', 'weekly']) {
    const s = buildStatus([config({ type: 'archive', period })], old, NOW)
    assert.equal(s.rows[0].status, 'ok')
    assert.equal(s.rows[0].reason, null)
  }
  const pruned = buildStatus([config({ period: '' })], [snap({ time: new Date(NOW - 30 * 24 * H) })], NOW)
  assert.equal(pruned.rows[0].status, 'ok')
})

test('a feed without a declared period still reports failing from feed health', () => {
  const failing = buildStatus([config({ period: '', consecutiveFailures: 2, lastFailedFetch: new Date(NOW - 30_000) })], [snap()], NOW)
  assert.equal(failing.rows[0].status, 'failing')
  const none = buildStatus([config({ period: '' })], [], NOW)
  assert.equal(none.rows[0].status, 'failing')
  assert.equal(none.rows[0].reason, 'No current snapshots')
})

test('a fresh feed is OK, with count, newest time and last sync', () => {
  const s = buildStatus([config()], [snap(), snap({ time: new Date(NOW - 6 * H) })], NOW)
  assert.equal(s.totalSnapshots, 2)
  assert.equal(s.lastSyncAt, new Date(NOW - 60_000).toISOString())
  assert.deepEqual(s.rows, [{
    contributor: 'deNodes', chain_id: 'celestia', type: 'pruned', status: 'ok', reason: null,
    newestSnapshotAt: new Date(NOW - 2 * H).toISOString(), snapshotCount: 2,
    period: '4h', actualIntervalHours: null, snapshotsAllTime: 0, uptimePct: null,
    newestHeight: null, newestSize: null, timeline: [],
  }])
})

test('an old newest snapshot is stale', () => {
  const s = buildStatus([config()], [snap({ time: new Date(NOW - 9 * H) })], NOW)
  assert.equal(s.rows[0].status, 'stale')
})

test('a failed last check is failing with a fixed category', () => {
  const s = buildStatus([config({ consecutiveFailures: 3, lastFailedFetch: new Date(NOW - 30_000), lastSuccessfulFetch: new Date(NOW - 5 * H) })], [], NOW)
  assert.equal(s.rows[0].status, 'failing')
  assert.equal(s.rows[0].reason, 'Feed unreachable or no valid entries')
  assert.equal(s.rows[0].snapshotCount, 0)
})

test('configurations the last sync no longer touched are left out', () => {
  const gone = config({ contributorName: 'Old', lastSuccessfulFetch: new Date(NOW - 3 * 24 * H) })
  const s = buildStatus([config(), gone], [snap()], NOW)
  assert.deepEqual(s.rows.map(r => r.contributor), ['deNodes'])
})

test('rows sort by chain ID, then contributor, then type', () => {
  const s = buildStatus([
    config({ chain_id: 'mocha-4', contributorName: 'a' }),
    config({ contributorName: 'Polkachu' }),
    config({ contributorName: 'kjnodes', type: 'pruned' }),
    config({ contributorName: 'kjnodes', type: 'archive' }),
  ], [], NOW)
  assert.deepEqual(s.rows.map(r => `${r.chain_id}/${r.contributor}/${r.type}`), [
    'celestia/kjnodes/archive', 'celestia/kjnodes/pruned', 'celestia/Polkachu/pruned', 'mocha-4/a/pruned',
  ])
})

test('empty or missing types on both sides are treated as unknown and still match', () => {
  const cases = [['', ''], [undefined, null], ['  ', '']]
  for (const [configType, snapType] of cases) {
    const s = buildStatus([config({ type: configType })], [snap({ type: snapType })], NOW)
    assert.equal(s.rows.length, 1)
    assert.equal(s.rows[0].type, 'unknown')
    assert.equal(s.rows[0].status, 'ok')
    assert.equal(s.rows[0].snapshotCount, 1)
  }
})

test('an unknown type on one side does not match a named type on the other', () => {
  const s = buildStatus([config({ type: '' })], [snap({ type: 'pruned' })], NOW)
  assert.equal(s.rows[0].status, 'failing')
})

test('median interval is the median gap between consecutive times, null below two', () => {
  assert.equal(medianIntervalHours([]), null)
  assert.equal(medianIntervalHours([new Date(NOW)]), null)
  assert.equal(medianIntervalHours([new Date(NOW), new Date(NOW - 4 * H)]), 4)
  // gaps 2h, 4h, 24h in any input order: median 4h
  const times = [new Date(NOW - 30 * H), new Date(NOW), new Date(NOW - 6 * H), new Date(NOW - 2 * H)]
  assert.equal(medianIntervalHours(times), 4)
  // even number of gaps (2h, 2h, 4h, 24h): mean of the middle two (2h and 4h)
  assert.equal(medianIntervalHours([new Date(NOW - 8 * H), new Date(NOW - 6 * H), new Date(NOW - 4 * H), new Date(NOW), new Date(NOW + 24 * H)]), 3)
})

test('interval counts each snapshot time once', () => {
  // kjnodes mocha-5: 6h apart, with the same time stored twice (a duplicate row)
  const times = ['2026-10-20T11:00:30Z', '2026-10-20T11:00:30Z', '2026-10-20T11:00:30Z', '2026-10-20T17:00:30Z', '2026-10-20T23:00:30Z']
  assert.equal(medianIntervalHours(times), 6)
  // the same time twice is one snapshot time, so no interval
  assert.equal(medianIntervalHours(['2026-10-20T11:00:30Z', '2026-10-20T11:00:30Z']), null)
})

test('height rule: height 0 or less only passes for the exact type archive', () => {
  assert.equal(passesHeightRule('pruned', 100), true)
  assert.equal(passesHeightRule('pruned', 0), false)
  assert.equal(passesHeightRule('pruned', -1), false)
  assert.equal(passesHeightRule('Archive', 0), false)
  assert.equal(passesHeightRule('archive', 0), true)
  assert.equal(passesHeightRule('', 0), false)
})

test('daily counts bucket by UTC day and contributor, fill empty days, order contributors by total', () => {
  const d = buildDailyNew([
    { day: '2026-10-18', contributor: 'a', count: 2 },
    { day: '2026-10-18', contributor: 'b', count: 5 },
    { day: '2026-10-18', contributor: 'a', count: 1 },
    { day: '2026-10-19', contributor: 'a', count: 1 },
    { day: '2026-01-01', contributor: 'old', count: 9 },
  ], NOW, 3)
  assert.deepEqual(d.days.map(x => x.date), ['2026-10-17', '2026-10-18', '2026-10-19'])
  assert.deepEqual(d.days.map(x => x.total), [0, 8, 1])
  assert.deepEqual(d.days[1].counts, { a: 3, b: 5 })
  assert.deepEqual(d.contributors, ['b', 'a'])
  assert.equal(buildDailyNew([], NOW).days.length, 90)
})

test('extras fill feed rows and totals', () => {
  const histories = [{
    contributorName: 'deNodes', chainName: 'Celestia', chain_id: 'celestia', type: 'pruned', count: 5,
    times: [new Date(NOW - 2 * H), new Date(NOW - 6 * H), new Date(NOW - 10 * H), new Date(NOW - 40 * 24 * H)], newestHeight: 123, newestSize: '10GB',
  }]
  const s = buildStatus(
    [config({ uptimeTotalChecks: 200, uptimeSuccessfulChecks: 190 })],
    [snap({ sizeBytes: 100 }), snap({ time: new Date(NOW - 6 * H), sizeBytes: 50 })],
    NOW,
    { histories, allTime: { count: 9, newest: { contributorName: 'deNodes', chain_id: 'celestia', time: new Date(NOW - 2 * H) }, earliestFirstSeen: new Date('2026-09-01T00:00:00Z') } }
  )
  const r = s.rows[0]
  assert.equal(r.snapshotsAllTime, 5)
  assert.equal(r.uptimePct, 95)
  assert.equal(r.newestHeight, 123)
  assert.equal(r.newestSize, '10GB')
  assert.equal(r.actualIntervalHours, 4)
  assert.equal(r.timeline.length, 3)
  assert.ok(r.timeline[0] < r.timeline[1])
  assert.deepEqual(s.totals, {
    snapshotsAllTime: 9, snapshotsCurrent: 2, contributors: 1, feeds: 1, chainIds: 1, dataAvailableBytes: 150,
    newestSnapshot: { contributor: 'deNodes', chain_id: 'celestia', time: new Date(NOW - 2 * H).toISOString() },
    historySince: '2026-09-01T00:00:00.000Z',
  })
})

test('zero history renders empty totals', () => {
  const s = buildStatus([], [], NOW)
  assert.equal(s.totals.snapshotsAllTime, 0)
  assert.equal(s.totals.newestSnapshot, null)
  assert.equal(s.totals.historySince, null)
  assert.deepEqual(s.rows, [])
})

test('two history groups for one feed merge counts and times', () => {
  const group = (times, count, newestHeight) => ({
    contributorName: 'deNodes', chainName: 'Celestia', chain_id: 'celestia', type: 'pruned', count,
    times: times.map(h => new Date(NOW - h * H)), newestHeight, newestSize: '1GB',
  })
  const s = buildStatus([config()], [snap()], NOW, { histories: [group([10, 14], 2, 5), group([2, 6], 2, 9)] })
  const r = s.rows[0]
  assert.equal(r.snapshotsAllTime, 4)
  assert.equal(r.newestHeight, 9)
  assert.equal(r.timeline.length, 4)
  assert.equal(r.actualIntervalHours, 4)
})

test('thin keeps the first and last item and spreads the rest evenly', () => {
  const items = Array.from({ length: 1000 }, (_, i) => i)
  const out = thin(items, 400)
  assert.equal(out.length, 400)
  assert.equal(out[0], 0)
  assert.equal(out.at(-1), 999)
  assert.ok(out.every((v, i) => i === 0 || v > out[i - 1]))
  assert.deepEqual(thin([1, 2, 3], 400), [1, 2, 3])
})
