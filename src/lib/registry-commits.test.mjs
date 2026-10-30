// Run with: node --test src/lib/registry-commits.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lastPageFromLink, commitDate, earliestDate } from './registry-commits.ts'

test('last page comes from the rel="last" link', () => {
  const link = '<https://api.github.com/repositories/1/commits?path=a.json&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?path=a.json&per_page=1&page=7>; rel="last"'
  assert.equal(lastPageFromLink(link), 7)
})

test('a single page has no last link', () => {
  assert.equal(lastPageFromLink(null), null)
  assert.equal(lastPageFromLink(''), null)
  assert.equal(lastPageFromLink('<https://api.github.com/x?page=1>; rel="first"'), null)
})

test('commit date is the committer date, null when missing or invalid', () => {
  assert.equal(commitDate({ commit: { committer: { date: '2026-10-01T17:45:00Z' } } })?.toISOString(), '2026-10-01T17:45:00.000Z')
  assert.equal(commitDate({ commit: {} }), null)
  assert.equal(commitDate({ commit: { committer: { date: 'nope' } } }), null)
  assert.equal(commitDate(null), null)
})

test('earliest date ignores nulls and is null for none', () => {
  const a = new Date('2026-10-05T00:00:00Z')
  const b = new Date('2026-10-01T00:00:00Z')
  assert.equal(earliestDate([a, null, b])?.toISOString(), b.toISOString())
  assert.equal(earliestDate([null]), null)
  assert.equal(earliestDate([]), null)
})

import { resolveRegistryJoin, registryJoinUpdates } from './registry-commits.ts'

const DE_CELESTIA = 'chains/celestia/celestia/denodes.json'
const DE_MOCHA = 'chains/celestia/mocha-5/denodes.json'
const dates = {
  [DE_CELESTIA]: new Date('2025-07-25T10:00:00Z'),
  [DE_MOCHA]: new Date('2026-10-19T10:00:00Z'),
}
const lookup = calls => async path => { calls.push(path); return dates[path] ?? null }

test('a partial registry read resolves nothing', async () => {
  const calls = []
  assert.equal(await resolveRegistryJoin(undefined, [DE_MOCHA], false, lookup(calls)), null)
  assert.deepEqual(calls, [])
})

test('a complete read stores the earliest date over all files with their paths', async () => {
  const r = await resolveRegistryJoin(undefined, [DE_MOCHA, DE_CELESTIA], true, lookup([]))
  assert.equal(r.addedAt.toISOString(), '2025-07-25T10:00:00.000Z')
  assert.deepEqual(r.paths, [DE_CELESTIA, DE_MOCHA].sort())
})

test('a file that appears later is looked up and the stored date only moves earlier', async () => {
  const stored = { addedAt: dates[DE_MOCHA], paths: [DE_MOCHA] }
  const calls = []
  const r = await resolveRegistryJoin(stored, [DE_MOCHA, DE_CELESTIA], true, lookup(calls))
  assert.deepEqual(calls, [DE_CELESTIA])
  assert.equal(r.addedAt.toISOString(), '2025-07-25T10:00:00.000Z')
  const later = await resolveRegistryJoin({ addedAt: dates[DE_CELESTIA], paths: [DE_CELESTIA] }, [DE_CELESTIA, DE_MOCHA], true, lookup([]))
  assert.equal(later.addedAt.toISOString(), '2025-07-25T10:00:00.000Z')
})

test('nothing is fetched when the stored basis covers every file', async () => {
  const calls = []
  const stored = { addedAt: dates[DE_CELESTIA], paths: [DE_CELESTIA, DE_MOCHA] }
  assert.equal(await resolveRegistryJoin(stored, [DE_MOCHA, DE_CELESTIA], true, lookup(calls)), null)
  assert.deepEqual(calls, [])
})

test('an unreadable file history leaves the date unresolved', async () => {
  assert.equal(await resolveRegistryJoin(undefined, [DE_CELESTIA, 'chains/x/y/z.json'], true, lookup([])), null)
})

// Evaluates the date filter the way MongoDB does: {field: null} matches null and missing, $gt compares dates.
function dateFilterMatches(filter, doc) {
  const stored = doc.registryAddedAt
  return filter.$or.some(cond => {
    const c = cond.registryAddedAt
    if (c === null) return stored === null || stored === undefined
    return stored instanceof Date && stored.getTime() > c.$gt.getTime()
  })
}

test('the date write replaces null, missing and later dates, never an earlier or equal one', () => {
  const at = new Date('2025-07-25T10:00:00Z')
  const { date } = registryJoinUpdates('deNodes', at, ['a.json'])
  assert.deepEqual(date.update, { $set: { registryAddedAt: at } })
  assert.equal(dateFilterMatches(date.filter, { registryAddedAt: null }), true)
  assert.equal(dateFilterMatches(date.filter, {}), true)
  assert.equal(dateFilterMatches(date.filter, { registryAddedAt: new Date('2026-10-19T10:00:00Z') }), true)
  assert.equal(dateFilterMatches(date.filter, { registryAddedAt: new Date('2025-01-01T00:00:00Z') }), false)
  assert.equal(dateFilterMatches(date.filter, { registryAddedAt: at }), false)
})

test('paths are added with $addToSet and the writes need a resolved date', () => {
  const at = new Date('2025-07-25T10:00:00Z')
  const { paths } = registryJoinUpdates('deNodes', at, ['b.json', 'a.json'])
  assert.deepEqual(paths.filter, { name: 'deNodes' })
  assert.deepEqual(paths.update, { $addToSet: { registryAddedPaths: { $each: ['b.json', 'a.json'] } } })
  assert.deepEqual(registryJoinUpdates('deNodes', at, undefined).paths.update.$addToSet, { registryAddedPaths: { $each: [] } })
  assert.equal(registryJoinUpdates('deNodes', null, ['a.json']), null)
  assert.equal(registryJoinUpdates('deNodes', undefined, ['a.json']), null)
})

test('paths stored without a date are looked up again, so a lost date write heals', async () => {
  const calls = []
  const r = await resolveRegistryJoin({ addedAt: null, paths: [DE_CELESTIA] }, [DE_CELESTIA], true, lookup(calls))
  assert.deepEqual(calls, [DE_CELESTIA])
  assert.equal(r.addedAt.toISOString(), '2025-07-25T10:00:00.000Z')
})
