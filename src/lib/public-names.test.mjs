// Run with: node --test src/lib/public-names.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toPublicChainFields, readChainQuery } from './public-names.ts'

test('the stored network name becomes the public network and the stored mainnet value the public chain', () => {
  const stored = {
    chain: { name: 'Celestia', display_name: 'Celestia', image: '/celestia-logo.svg' },
    network: 'mainnet',
    chain_id: 'celestia'
  }
  assert.deepEqual(toPublicChainFields(stored), {
    network: { name: 'Celestia', display_name: 'Celestia', image: 'https://celestia.snapsvault.xyz/celestia-logo.svg' },
    chain: 'mainnet',
    chain_id: 'celestia'
  })
})

test('query parameters keep their public meaning', () => {
  const query = readChainQuery(new URLSearchParams('network=celestia&chain=testnet&chain_id=mocha-5'))
  assert.deepEqual(query, { network: 'celestia', chain: 'testnet', chain_id: 'mocha-5' })
})

test('absent parameters are null', () => {
  assert.deepEqual(readChainQuery(new URLSearchParams('')), { network: null, chain: null, chain_id: null })
})

import { networksSummary, toPublicConfigurationFields, toPublicConfigurationStats, toPublicConfigurationSummary, toPublicFlatFields, toPublicNetworkFields, toPublicAvailableOptions, toPublicQueryEcho } from './public-names.ts'

test('flat rows carry the network name and the chain', () => {
  assert.deepEqual(toPublicFlatFields({ chain: { name: 'Celestia' }, network: 'testnet', chain_id: 'mocha-5' }), { network: 'Celestia', chain_id: 'mocha-5', chain: 'testnet' })
})

test('network rows rename the stored lists', () => {
  assert.deepEqual(toPublicNetworkFields({ networkName: 'Celestia', chain_id: 'celestia', chains: ['mainnet'] }), { network: 'Celestia', chain_id: 'celestia', chains: ['mainnet'] })
})

test('networks summary counts networks, chain IDs and chains by their own meaning', () => {
  const rows = [
    { networkName: 'Celestia', chain_id: 'celestia', chains: ['mainnet'], snapshotCount: 9, hasSnapshots: true },
    { networkName: 'Celestia', chain_id: 'mocha-5', chains: ['testnet'], snapshotCount: 5, hasSnapshots: true },
    { networkName: 'Celestia', chain_id: 'mocha-4', chains: ['testnet'], snapshotCount: 0, hasSnapshots: false }
  ]
  assert.deepEqual(networksSummary(rows), { total_networks: 1, total_chain_ids: 3, chain_ids_with_snapshots: 2, total_snapshots: 14, total_chains: 2 })
})

test('configuration rows and summaries use the public names', () => {
  assert.deepEqual(toPublicConfigurationFields({ chainName: 'celestia', network: 'mainnet' }, true), { network: 'celestia', chain: 'mainnet' })
  assert.deepEqual(toPublicConfigurationFields({ chainName: 'celestia', network: 'mainnet' }, false), { chain: 'mainnet' })
  const summary = toPublicConfigurationSummary({ totalConfigurations: 2, chains: [{ name: 'celestia/mocha-5', configurationsCount: 2, availableCount: 1 }] })
  assert.deepEqual(summary, { totalConfigurations: 2, chain_ids: [{ network: 'celestia', chain_id: 'mocha-5', configurationsCount: 2, availableCount: 1 }] })
  const stats = toPublicConfigurationStats({ totalConfigurations: 2, configurationsByChain: [{ chainName: 'celestia', count: 2 }] })
  assert.deepEqual(stats, { totalConfigurations: 2, configurations_by_network: [{ network: 'celestia', count: 2 }] })
})

test('query echo and available options use the public names', () => {
  assert.deepEqual(toPublicQueryEcho({ network: 'celestia', chain_id: null, chain: 'mainnet' }), { network: 'celestia', chain_id: null, chain: 'mainnet' })
  const options = toPublicAvailableOptions([{ chain_id: 'mocha-5', network: 'testnet', type: 'pruned', contributor: { name: 'b' } }, { chain_id: 'celestia', network: 'mainnet', type: 'pruned', contributor: { name: 'a' } }])
  assert.deepEqual(options, { chain_ids: ['celestia', 'mocha-5'], chains: ['mainnet', 'testnet'], contributors: ['a', 'b'], types: ['pruned'] })
})

import { absoluteUrl, relativeUrl, toPublicChecksum } from './public-names.ts'

test('app paths become absolute URLs and other values stay as they are', () => {
  assert.equal(absoluteUrl('/default-contributor.svg'), 'https://celestia.snapsvault.xyz/default-contributor.svg')
  assert.equal(absoluteUrl('https://example.com/a.png'), 'https://example.com/a.png')
  assert.equal(absoluteUrl('//evil.example/a.png'), '//evil.example/a.png')
})

test('an absolute URL of this site goes back to a path', () => {
  assert.equal(relativeUrl('https://celestia.snapsvault.xyz/api/keybase-avatar/ABCDEF0123456789'), '/api/keybase-avatar/ABCDEF0123456789')
  assert.equal(relativeUrl('https://example.com/a.png'), 'https://example.com/a.png')
})

test('a checksum keeps only the hashes', () => {
  assert.deepEqual(toPublicChecksum({ sha256: 'ab', md5: null, _id: 'x' }), { sha256: 'ab' })
  assert.equal(toPublicChecksum({}), undefined)
  assert.equal(toPublicChecksum(undefined), undefined)
})
