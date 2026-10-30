// Run with: node --test src/lib/next-update.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatNextUpdate } from './next-update.ts'

const NOW = Date.parse('2026-10-20T12:00:00Z')
const MIN = 60 * 1000
const H = 60 * MIN
const D = 24 * H

// Snapshot made at `NOW - 4h + remainingMs` with a 4h period is due in `remainingMs`.
const due = (remainingMs, period = '4h') => formatNextUpdate(NOW + remainingMs - 4 * H, period, NOW)

test('under 5 minutes away', () => {
  assert.equal(due(1), 'Next in a few min')
  assert.equal(due(4 * MIN + 59_000), 'Next in a few min')
})

test('under an hour is floored to a multiple of 5 minutes', () => {
  assert.equal(due(5 * MIN), 'Next in ~5 min')
  assert.equal(due(33 * MIN), 'Next in ~30 min')
  assert.equal(due(59 * MIN), 'Next in ~55 min')
})

test('under a day is rounded to hours', () => {
  assert.equal(due(H), 'Next in ~1 h')
  assert.equal(due(2 * H + 29 * MIN), 'Next in ~2 h')
  assert.equal(due(2 * H + 30 * MIN), 'Next in ~3 h')
  assert.equal(due(24 * H - MIN), 'Next in ~24 h')
})

test('a day or more is rounded to days', () => {
  assert.equal(due(D), 'Next in ~1 d')
  assert.equal(due(2 * D + 11 * H), 'Next in ~2 d')
  assert.equal(due(2 * D + 12 * H), 'Next in ~3 d')
})

test('overdue by at most 15 minutes', () => {
  assert.equal(due(0), 'Next in a few min')
  assert.equal(due(-15 * MIN), 'Next in a few min')
})

test('overdue by more than 15 minutes', () => {
  assert.equal(due(-16 * MIN), 'Overdue ~15 min')
  assert.equal(due(-33 * MIN), 'Overdue ~30 min')
  assert.equal(due(-3 * H), 'Overdue ~3 h')
  assert.equal(due(-2 * D), 'Overdue ~2 d')
})

test('period units parse, an unparsable or empty period gives no label', () => {
  assert.equal(formatNextUpdate(NOW, '1d', NOW), 'Next in ~1 d')
  assert.equal(formatNextUpdate(NOW, '1w', NOW), 'Next in ~7 d')
  assert.equal(formatNextUpdate(NOW, '', NOW), null)
  assert.equal(formatNextUpdate(NOW, 'unknown', NOW), null)
  assert.equal(formatNextUpdate(NOW, 'varies', NOW), null)
})
