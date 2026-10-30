// Run with: node --test src/lib/contributor-profile.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registryProfile } from './contributor-profile.ts'

test('a field absent from the registry file is unset, not kept from the stored profile', () => {
  const stored = { email: 'old@example.com', logo_url: 'https://example.com/old.png', website: 'https://example.com' }
  Object.assign(stored, registryProfile({ website: 'https://example.com' }))
  assert.equal(stored.logo_url, undefined)
  assert.equal(stored.email, undefined)
  assert.equal(stored.website, 'https://example.com')
})

test('every profile field is listed, so each one can be unset', () => {
  assert.deepEqual(Object.keys(registryProfile({})).sort(), ['description', 'discord', 'email', 'identity', 'logo_url', 'telegram', 'website', 'x'])
})

test('an empty value counts as absent', () => {
  assert.equal(registryProfile({ discord: '' }).discord, undefined)
})
