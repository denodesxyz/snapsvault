// Run with: node --test src/lib/time-format.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatLocal, formatUtc } from './time-format.ts'

test('UTC output is labelled and independent of the process time zone', () => {
  assert.equal(formatUtc('2026-10-22T14:32:05Z'), '22 October 2026, 14:32 UTC')
  assert.equal(formatUtc('2026-10-22T14:32:05Z', 'datetime', true), '22 October 2026, 14:32:05 UTC')
  assert.equal(formatUtc('2026-10-22T23:59:00Z', 'date'), '22 October 2026 UTC')
})

test('local output follows the viewer time zone', () => {
  const prev = process.env.TZ
  process.env.TZ = 'Asia/Tokyo'
  assert.equal(formatLocal('2026-10-22T14:32:05Z'), '22 October 2026, 23:32')
  assert.equal(formatLocal('2026-10-22T23:59:00Z', 'date'), '23 October 2026')
  process.env.TZ = prev
})
