// Run with: node --test src/lib/validation/public-host.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkPublicHost, isPublicAddress } from './public-host.ts'

const resolveTo = (...addresses) => async () => addresses.map(address => ({ address }))

test('public IPv4 and IPv6 addresses pass', () => {
  for (const a of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '100.63.255.255', '100.128.0.1', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111', '2001:4860:4860::8888']) {
    assert.equal(isPublicAddress(a), true, a)
  }
})

test('private, loopback, link-local, CGNAT and reserved IPv4 addresses are refused', () => {
  for (const a of ['0.0.0.0', '10.1.2.3', '100.64.0.1', '100.127.255.255', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '198.18.0.1', '224.0.0.1', '255.255.255.255']) {
    assert.equal(isPublicAddress(a), false, a)
  }
})

test('loopback, unique local, link-local and mapped private IPv6 addresses are refused', () => {
  for (const a of ['::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fe80::1%eth0', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', '64:ff9b::a00:1', '2001:db8::1', '64:ff9b:1::1', '::ffff:0:a00:1', '2002:0808:0808::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '100::1']) {
    assert.equal(isPublicAddress(a), false, a)
  }
})

test('a mapped public IPv4 address passes and a malformed address is refused', () => {
  assert.equal(isPublicAddress('::ffff:8.8.8.8'), true)
  assert.equal(isPublicAddress('64:ff9b::808:808'), true)
  assert.equal(isPublicAddress('not-an-ip'), false)
  assert.equal(isPublicAddress('1:2:3'), false)
})

test('a public name that resolves to a private address is refused', async () => {
  const r = await checkPublicHost('feeds.example.com', resolveTo('10.0.0.5'))
  assert.deepEqual(r, { ok: false, reason: 'host resolves to a non-public address' })
})

test('one private answer among public ones refuses the host', async () => {
  const r = await checkPublicHost('feeds.example.com', resolveTo('8.8.8.8', '127.0.0.1'))
  assert.equal(r.ok, false)
})

test('a host with only public answers passes', async () => {
  assert.deepEqual(await checkPublicHost('feeds.example.com', resolveTo('8.8.8.8', '2606:4700:4700::1111')), { ok: true })
})

test('a host that does not resolve or has no address is refused', async () => {
  assert.equal((await checkPublicHost('feeds.example.com', async () => { throw new Error('ENOTFOUND') })).ok, false)
  assert.equal((await checkPublicHost('feeds.example.com', resolveTo())).ok, false)
})

test('a lookup that never answers is refused after the timeout', async () => {
  const never = () => new Promise(() => {})
  const r = await checkPublicHost('feeds.example.com', never, 20)
  assert.deepEqual(r, { ok: false, reason: 'host lookup timed out' })
})
