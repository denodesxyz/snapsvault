// Run with: node --test src/hooks/use-snapshots.test.mjs
// Covers the fetch lifecycle behind useSnapshots: first load, silent
// refresh, refresh failures, request sequencing, abort and polling.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { SnapshotsFeed, LOAD_ERROR_MESSAGE, REFRESH_ERROR_MESSAGE } from './use-snapshots.ts'

const snap = (h) => ({ block_height: h, network: { name: 'Celestia' }, contributor: { name: 'x' } })

// A fetch whose responses are resolved by the test, in any order.
function controlledFetch() {
  const calls = []
  const fetchImpl = (url, init) => new Promise((resolve, reject) => {
    const call = {
      url,
      signal: init?.signal,
      ok: (body) => resolve({ ok: true, status: 200, json: async () => body }),
      status: (code) => resolve({ ok: false, status: code, json: async () => ({ error: 'x' }) }),
    }
    init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    calls.push(call)
  })
  return { calls, fetchImpl }
}

const tick = () => new Promise((r) => setImmediate(r))
const quiet = () => mock.method(console, 'error', () => {})

test('first load sets loading, then data; a refresh keeps data and never sets loading', async () => {
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  const seen = []
  feed.subscribe(() => seen.push(feed.getState()))

  const first = feed.load()
  assert.equal(feed.getState().loading, true)
  calls[0].ok({ data: [snap(1)], last_updated: 't1' })
  await first
  assert.equal(feed.getState().loading, false)
  assert.equal(feed.getState().loaded, true)
  assert.deepEqual(feed.getState().snapshots.map((s) => s.block_height), [1])

  const second = feed.load()
  assert.equal(feed.getState().loading, false)
  assert.equal(feed.getState().refreshing, true)
  assert.equal(feed.getState().snapshots.length, 1)
  calls[1].ok({ data: [snap(1), snap(2)], last_updated: 't2' })
  await second
  assert.equal(feed.getState().refreshing, false)
  assert.equal(feed.getState().snapshots.length, 2)
  assert.equal(feed.getState().lastUpdated, 't2')
  assert.ok(seen.slice(2).every((s) => s.loading === false && s.snapshots.length > 0))
})

test('a failed first load sets a fixed error message, never the raw HTTP text', async () => {
  const restore = quiet()
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  const p = feed.load()
  calls[0].status(500)
  await p
  assert.equal(feed.getState().error, LOAD_ERROR_MESSAGE)
  assert.equal(feed.getState().loading, false)
  assert.equal(feed.getState().loaded, false)
  restore.mock.restore()
})

test('a failed refresh keeps the loaded data and only sets refreshError', async () => {
  const restore = quiet()
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  feed.seed({ data: [snap(1), snap(2)], last_updated: 't1' })
  const p = feed.load()
  calls[0].status(500)
  await p
  const s = feed.getState()
  assert.equal(s.error, null)
  assert.equal(s.refreshError, REFRESH_ERROR_MESSAGE)
  assert.equal(s.snapshots.length, 2)
  assert.equal(s.lastUpdated, 't1')

  const ok = feed.load()
  calls[1].ok({ data: [snap(3)], last_updated: 't2' })
  await ok
  assert.equal(feed.getState().refreshError, null)
  restore.mock.restore()
})

test('a forced load aborts the older request and the older response is ignored', async () => {
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  const older = feed.load()
  const newer = feed.load({ force: true })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].signal.aborted, true)
  calls[1].ok({ data: [snap(2)], last_updated: 't2' })
  await newer
  calls[0].ok({ data: [snap(1)], last_updated: 't1' })
  await older
  assert.deepEqual(feed.getState().snapshots.map((s) => s.block_height), [2])
  assert.equal(feed.getState().error, null)
})

test('a non-forced load while one is in flight reuses it (no duplicate request)', async () => {
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  const a = feed.load()
  const b = feed.load()
  assert.equal(calls.length, 1)
  assert.equal(a, b)
  calls[0].ok({ data: [], last_updated: 't' })
  await a
  assert.equal(feed.getState().loaded, true)
  assert.equal(feed.getState().snapshots.length, 0)
})

test('the last subscriber leaving aborts the request and clears the busy flags', async () => {
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  const unsubscribe = feed.subscribe(() => {})
  const p = feed.load()
  unsubscribe()
  await p
  assert.equal(calls[0].signal.aborted, true)
  assert.equal(feed.getState().loading, false)
  assert.equal(feed.getState().error, null)
})

test('seed keeps the newer of cached and server data', () => {
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: () => new Promise(() => {}) })
  feed.seed({ data: [snap(2)], last_updated: '2026-10-14T10:05:00.000Z' })
  feed.seed({ data: [snap(1)], last_updated: '2026-10-14T10:00:00.000Z' })
  assert.deepEqual(feed.getState().snapshots.map((s) => s.block_height), [2])
  feed.seed({ data: [snap(3)], last_updated: '2026-10-14T10:10:00.000Z' })
  assert.deepEqual(feed.getState().snapshots.map((s) => s.block_height), [3])
})

test('polling skips hidden tabs, and ensureFresh only fetches stale or empty feeds', async () => {
  mock.timers.enable({ apis: ['setInterval', 'Date'], now: 0 })
  try {
    const { calls, fetchImpl } = controlledFetch()
    const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
    feed.seed({ data: [snap(1)], last_updated: 't0' })

    assert.equal(feed.ensureFresh(1000), undefined)
    assert.equal(calls.length, 0)

    let hidden = true
    const stop = feed.startPolling(1000, () => hidden)
    mock.timers.tick(1000)
    assert.equal(calls.length, 0)

    hidden = false
    mock.timers.tick(1000)
    assert.equal(calls.length, 1)
    assert.equal(feed.getState().loading, false)
    calls[0].ok({ data: [snap(1), snap(2)], last_updated: 't1' })
    await tick()
    assert.equal(feed.getState().snapshots.length, 2)

    stop()
    mock.timers.tick(5000)
    assert.equal(calls.length, 1)

    feed.ensureFresh(1000)
    assert.equal(calls.length, 2)
  } finally {
    mock.timers.reset()
  }
})

// Responses can come from a CDN copy that is older than the data on screen.
function loadedFeed(lastUpdated, heights) {
  const { calls, fetchImpl } = controlledFetch()
  const feed = new SnapshotsFeed('/api/snapshots?', { fetch: fetchImpl })
  feed.seed({ data: heights.map(snap), last_updated: lastUpdated })
  return { feed, calls }
}

test('a refresh with an older last_updated keeps the current data, with no error', async () => {
  const restore = quiet()
  const { feed, calls } = loadedFeed('2026-10-14T10:05:00.000Z', [2])
  const failed = feed.load()
  calls[0].status(500)
  await failed
  assert.equal(feed.getState().refreshError, REFRESH_ERROR_MESSAGE)

  const p = feed.load()
  calls[1].ok({ data: [snap(1)], last_updated: '2026-10-14T10:00:00.000Z' })
  await p
  const s = feed.getState()
  assert.deepEqual(s.snapshots.map((x) => x.block_height), [2])
  assert.equal(s.lastUpdated, '2026-10-14T10:05:00.000Z')
  assert.equal(s.refreshing, false)
  assert.equal(s.refreshError, null)
  assert.equal(s.error, null)
  restore.mock.restore()
})

test('a refresh with a newer last_updated replaces the data', async () => {
  const { feed, calls } = loadedFeed('2026-10-14T10:00:00.000Z', [1])
  const p = feed.load()
  calls[0].ok({ data: [snap(2)], last_updated: '2026-10-14T10:05:00.000Z' })
  await p
  assert.deepEqual(feed.getState().snapshots.map((x) => x.block_height), [2])
  assert.equal(feed.getState().lastUpdated, '2026-10-14T10:05:00.000Z')
})

test('a refresh with an equal last_updated replaces the data', async () => {
  const { feed, calls } = loadedFeed('2026-10-14T10:00:00.000Z', [1])
  const p = feed.load()
  calls[0].ok({ data: [snap(1), snap(2)], last_updated: '2026-10-14T10:00:00.000Z' })
  await p
  assert.deepEqual(feed.getState().snapshots.map((x) => x.block_height), [1, 2])
})

test('a null last_updated never replaces a dated feed, and any response replaces an undated one', async () => {
  const dated = loadedFeed('2026-10-14T10:00:00.000Z', [1])
  const a = dated.feed.load()
  dated.calls[0].ok({ data: [snap(2)], last_updated: null })
  await a
  assert.deepEqual(dated.feed.getState().snapshots.map((x) => x.block_height), [1])
  assert.equal(dated.feed.getState().lastUpdated, '2026-10-14T10:00:00.000Z')
  assert.equal(dated.feed.getState().refreshing, false)

  const undated = loadedFeed(null, [1])
  const b = undated.feed.load()
  undated.calls[0].ok({ data: [snap(2)], last_updated: null })
  await b
  assert.deepEqual(undated.feed.getState().snapshots.map((x) => x.block_height), [2])
  const c = undated.feed.load()
  undated.calls[1].ok({ data: [snap(3)], last_updated: '2026-10-14T10:00:00.000Z' })
  await c
  assert.deepEqual(undated.feed.getState().snapshots.map((x) => x.block_height), [3])
  assert.equal(undated.feed.getState().lastUpdated, '2026-10-14T10:00:00.000Z')
})
