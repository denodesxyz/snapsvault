// Run with: node --test src/lib/chain-kind.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyChainId, chainForQuery, sameLabel } from './chain-kind.ts'

test('mocha-4 and mocha-5 are testnets', () => {
  assert.equal(classifyChainId('mocha-4'), 'testnet')
  assert.equal(classifyChainId('mocha-5'), 'testnet')
})

test('a chain ID containing test is a testnet in any case', () => {
  assert.equal(classifyChainId('my-testnet-1'), 'testnet')
  assert.equal(classifyChainId('TestChain'), 'testnet')
})

test('other chain IDs are mainnets, including near misses of the exact IDs', () => {
  assert.equal(classifyChainId('celestia'), 'mainnet')
  assert.equal(classifyChainId('mocha-6'), 'mainnet')
  assert.equal(classifyChainId('mocha'), 'mainnet')
  assert.equal(classifyChainId('arabica-11'), 'mainnet')
  assert.equal(classifyChainId('devnet-1'), 'mainnet')
})

test('a missing chain ID has no kind', () => {
  assert.equal(classifyChainId(undefined), null)
  assert.equal(classifyChainId(null), null)
  assert.equal(classifyChainId(''), null)
})


test('a chain ID without a chain gives the chain of that chain ID', () => {
  assert.equal(chainForQuery(null, 'mocha-5'), 'testnet')
  assert.equal(chainForQuery(null, 'MOCHA-4'), 'testnet')
  assert.equal(chainForQuery(null, 'celestia'), 'mainnet')
})

test('an explicit chain wins, and no chain ID gives no chain', () => {
  assert.equal(chainForQuery('mainnet', 'mocha-5'), 'mainnet')
  assert.equal(chainForQuery(null, null), null)
})

test('labels compare without regard to case', () => {
  assert.equal(sameLabel('mocha-5', 'MOCHA-5'), true)
  assert.equal(sameLabel('pruned', 'Archive'), false)
  assert.equal(sameLabel(undefined, 'pruned'), false)
})
