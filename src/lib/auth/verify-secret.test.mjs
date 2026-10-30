// Run with: node --test src/lib/auth/verify-secret.test.mjs
// Covers the bearer check used by the cron sync endpoint.
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { isAuthorized, safeCompare } from './verify-secret.ts'

const ORIGINAL = process.env.CRON_SECRET
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORIGINAL
})

function request(authorization) {
  return new Request('http://x/', authorization ? { headers: { authorization } } : undefined)
}

test('accepts the exact secret as a bearer token', () => {
  process.env.CRON_SECRET = 's3cret-value'
  assert.equal(isAuthorized(request('Bearer s3cret-value'), 'CRON_SECRET'), true)
})

test('rejects a missing, malformed or wrong header', () => {
  process.env.CRON_SECRET = 's3cret-value'
  assert.equal(isAuthorized(request(), 'CRON_SECRET'), false)
  assert.equal(isAuthorized(request('s3cret-value'), 'CRON_SECRET'), false)
  assert.equal(isAuthorized(request('Bearer '), 'CRON_SECRET'), false)
  assert.equal(isAuthorized(request('Bearer s3cret-valuX'), 'CRON_SECRET'), false)
  assert.equal(isAuthorized(request('Bearer s3cret'), 'CRON_SECRET'), false)
})

test('rejects everything when no secret is configured', () => {
  delete process.env.CRON_SECRET
  assert.equal(isAuthorized(request('Bearer '), 'CRON_SECRET'), false)
  assert.equal(isAuthorized(request('Bearer anything'), 'CRON_SECRET'), false)
})

test('safeCompare handles different lengths without throwing', () => {
  assert.equal(safeCompare('abc', 'abcd'), false)
  assert.equal(safeCompare('abc', 'abc'), true)
})
