// Run with: node --test src/lib/period-hours.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { averagePeriodHours } from './period-hours.ts'

test('no periods gives null', () => {
  assert.equal(averagePeriodHours([]), null)
})

test('empty and unknown periods give null, not 24 hours', () => {
  assert.equal(averagePeriodHours(['', 'weekly']), null)
})

test('unknown periods are left out of the average', () => {
  assert.equal(averagePeriodHours(['4h', '', 'x', '12h']), 8)
})
