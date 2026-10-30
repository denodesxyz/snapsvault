// Run with: node --test src/lib/status-system.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barState, buildSystem, syncComponentState, componentState, lastUtcDays, overallState, utcDay } from './status-system.ts'

const NOW = Date.parse('2026-10-20T12:00:00Z')
const MIN = 60 * 1000

test('day bucketing uses UTC days, oldest first, ending today', () => {
  assert.equal(utcDay(Date.parse('2026-10-20T23:59:59Z')), '2026-10-20')
  assert.equal(utcDay(Date.parse('2026-10-21T00:00:00Z')), '2026-10-21')
  const days = lastUtcDays(NOW, 3)
  assert.deepEqual(days, ['2026-10-18', '2026-10-19', '2026-10-20'])
  assert.equal(lastUtcDays(NOW, 90).length, 90)
  assert.equal(lastUtcDays(NOW, 90)[0], '2026-07-23')
})

test('bar state thresholds', () => {
  assert.equal(barState(0, 0), 'none')
  assert.equal(barState(288, 0), 'ok')
  assert.equal(barState(288, 1), 'degraded')
  assert.equal(barState(288, 144), 'degraded')
  assert.equal(barState(288, 145), 'down')
  assert.equal(barState(1, 1), 'down')
})

test('component state needs a check in the last 15 minutes', () => {
  const at = (minutesAgo, ok) => ({ component: 'api', at: new Date(NOW - minutesAgo * MIN), ok, first: new Date(NOW - 1e9) })
  assert.equal(componentState(at(1, true), NOW), 'ok')
  assert.equal(componentState(at(1, false), NOW), 'down')
  assert.equal(componentState(at(16, true), NOW), 'unknown')
  assert.equal(componentState(undefined, NOW), 'unknown')
})

test('banner state', () => {
  assert.equal(overallState([], true, false), 'unknown')
  assert.equal(overallState(['ok', 'ok'], true, true), 'operational')
  assert.equal(overallState(['ok', 'ok'], false, true), 'degraded')
  assert.equal(overallState(['ok', 'unknown'], true, true), 'degraded')
  assert.equal(overallState(['ok', 'down'], true, true), 'outage')
})

test('buildSystem with no history is unknown and has empty bars', () => {
  const s = buildSystem({ days: [], latest: [], runs24h: [], lastRunAt: null }, null, NOW)
  assert.equal(s.overall, 'unknown')
  assert.equal(s.components.length, 6)
  assert.deepEqual(s.components.map(c => c.label), ['Website', 'API', 'Sync', 'Database', 'Docs', 'Landing'])
  assert.ok(s.components.every(c => c.bars.length === 90 && c.bars.every(b => b.state === 'none') && c.uptimePct === null && c.since === null))
  assert.deepEqual(s.sync, { lastRunAt: null, successRate24h: null, avgDurationMs: null })
  assert.equal(s.historySince, null)
})

test('buildSystem derives bars, uptime, since and the sync summary', () => {
  const latest = ['website', 'api', 'sync', 'database', 'docs', 'landing'].map(component => ({
    component, at: new Date(NOW - MIN), ok: true, first: new Date('2026-10-18T10:00:00Z'),
  }))
  const days = [
    { component: 'api', day: '2026-10-19', total: 100, failed: 10 },
    { component: 'api', day: '2026-10-20', total: 100, failed: 0 },
  ]
  const runs24h = [
    { finished_at: new Date(NOW - 5 * MIN), duration_ms: 1000, ok: true },
    { finished_at: new Date(NOW - 3 * MIN), duration_ms: 3000, ok: false },
  ]
  const s = buildSystem({ days, latest, runs24h, lastRunAt: new Date(NOW - 3 * MIN), lastOkRunAt: new Date(NOW - 5 * MIN) }, null, NOW)
  const api = s.components[1]
  assert.equal(api.bars.at(-1).state, 'ok')
  assert.equal(api.bars.at(-2).state, 'degraded')
  assert.equal(api.bars.at(-3).state, 'none')
  assert.equal(api.uptimePct, 95)
  assert.equal(api.since, '2026-10-18T10:00:00.000Z')
  assert.equal(s.overall, 'operational')
  assert.equal(s.sync.successRate24h, 50)
  assert.equal(s.sync.avgDurationMs, 2000)
  assert.equal(s.historySince, '2026-10-18T10:00:00.000Z')
  assert.equal(s.historyFull, false)
})

test('failing newest runs never count as a fresh sync', () => {
  const latest = ['website', 'api', 'sync', 'database', 'docs', 'landing'].map(component => ({
    component, at: new Date(NOW - MIN), ok: true, first: new Date(NOW - 1e9),
  }))
  const runs24h = [{ finished_at: new Date(NOW - MIN), duration_ms: 1000, ok: false }]
  const s = buildSystem({ days: [], latest, runs24h, lastRunAt: new Date(NOW - MIN), lastOkRunAt: new Date(NOW - 60 * MIN) }, new Date(NOW - MIN).toISOString(), NOW)
  assert.equal(s.components[2].state, 'stale')
  assert.equal(s.overall, 'degraded')
  assert.equal(syncComponentState('ok', true), 'ok')
  assert.equal(syncComponentState('down', false), 'down')
})

test('without any run on record the feeds last fetch stands in', () => {
  const latest = [{ component: 'api', at: new Date(NOW - MIN), ok: true, first: new Date(NOW - 1e9) }]
  const s = buildSystem({ days: [], latest, runs24h: [], lastRunAt: null }, new Date(NOW - MIN).toISOString(), NOW)
  assert.notEqual(s.components[2].state, 'stale')
})

test('history is full once the earliest check is older than the bar window', () => {
  const at = daysAgo => [{ component: 'api', at: new Date(NOW - MIN), ok: true, first: new Date(NOW - daysAgo * 24 * 60 * MIN) }]
  assert.equal(buildSystem({ days: [], latest: at(89), runs24h: [], lastRunAt: null }, null, NOW).historyFull, true)
  assert.equal(buildSystem({ days: [], latest: at(88), runs24h: [], lastRunAt: null }, null, NOW).historyFull, false)
})
