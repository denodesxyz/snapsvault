// Run with: node --test src/lib/feed-reader.test.mjs
// The app imports its own modules without a file extension; this hook lets Node find the .ts files.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context) } catch (error) {
    if (specifier.startsWith('.') && !/\\.[a-z]+$/.test(specifier)) return next(specifier + '.ts', context)
    throw error
  }
}`))

const { readFeed } = await import('./feed-reader.ts')
const { unreadFeedScope } = await import('./snapshot-identity.ts')

const URL_OK = 'https://feeds.example.com/celestia.json'
const publicDns = async () => [{ address: '8.8.8.8' }]
const scope = { chainName: 'Celestia', chainId: 'celestia', contributorName: 'deNodes', type: 'pruned' }
const json = body => async () => new Response(JSON.stringify(body), { status: 200 })

// The scope the sync protects after reading one feed.
async function protectedAfter(url, io) {
  const log = console.error
  const warn = console.warn
  console.error = console.warn = () => {}
  try {
    const { read } = await readFeed(url, 'pruned', io)
    return unreadFeedScope(read, scope)
  } finally {
    console.error = log
    console.warn = warn
  }
}

test('a failed fetch protects the scope', async () => {
  const io = { resolve: publicDns, fetch: async () => { throw new TypeError('fetch failed') } }
  assert.deepEqual(await protectedAfter(URL_OK, io), scope)
})

test('a bad status protects the scope', async () => {
  const io = { resolve: publicDns, fetch: async () => new Response('x', { status: 503 }) }
  assert.deepEqual(await protectedAfter(URL_OK, io), scope)
})

test('a timeout protects the scope', async () => {
  const io = { resolve: publicDns, fetch: async () => { throw new DOMException('timed out', 'TimeoutError') } }
  assert.deepEqual(await protectedAfter(URL_OK, io), scope)
})

test('a rejected host protects the scope and nothing is fetched', async () => {
  let fetched = false
  const io = { resolve: async () => [{ address: '10.0.0.1' }], fetch: async () => { fetched = true; return new Response('[]') } }
  assert.deepEqual(await protectedAfter(URL_OK, io), scope)
  assert.equal(fetched, false)
})

test('a rejected feed URL protects the scope', async () => {
  const io = { resolve: publicDns, fetch: json([]) }
  assert.deepEqual(await protectedAfter('http://feeds.example.com/x.json', io), scope)
})

test('a feed that is not an array protects the scope', async () => {
  const io = { resolve: publicDns, fetch: json({ snapshots: [] }) }
  assert.deepEqual(await protectedAfter(URL_OK, io), scope)
})

test('a successfully read empty feed protects nothing', async () => {
  const io = { resolve: publicDns, fetch: json([]) }
  assert.equal(await protectedAfter(URL_OK, io), null)
})

test('a successfully read feed with entries returns them and protects nothing', async () => {
  const entry = { url: 'https://feeds.example.com/a.tar.lz4', size: '3GB', creation_date: '2026-10-19T12:00:00Z', latest_block_height: 100 }
  const io = { resolve: publicDns, fetch: json([entry]) }
  const log = console.warn
  console.warn = () => {}
  const result = await readFeed(URL_OK, 'pruned', io)
  console.warn = log
  assert.equal(result.read, true)
  assert.equal(result.entries.length, 1)
})
