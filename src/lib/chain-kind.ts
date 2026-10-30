export type ChainKind = 'mainnet' | 'testnet'

const TESTNET_CHAIN_IDS = ['mocha-4', 'mocha-5']

// A chain ID is a testnet when it is exactly mocha-4 or mocha-5, or contains "test"
// (case-insensitive). Every other chain ID is a mainnet. A missing chain ID has no kind.
export function classifyChainId(chainId: string | null | undefined): ChainKind | null {
  if (!chainId) return null
  if (TESTNET_CHAIN_IDS.includes(chainId) || chainId.toLowerCase().includes('test')) return 'testnet'
  return 'mainnet'
}

// Chain for a query that names a chain ID but no chain: the chain follows from the chain ID.
// With neither given there is no chain, and the caller applies its own default.
export function chainForQuery(chain: string | null | undefined, chainId: string | null | undefined): string | null {
  if (chain) return chain
  return classifyChainId(chainId ? chainId.toLowerCase() : null)
}

// Query values and stored values (chain, chain ID, type) are compared without regard to case.
export function sameLabel(stored: string | null | undefined, wanted: string): boolean {
  return typeof stored === 'string' && stored.toLowerCase() === wanted.toLowerCase()
}
