export const NETWORK_DATA = {
  celestia: {
    name: 'Celestia',
    image: '/celestia-logo.svg',
    description: 'Celestia is a modular blockchain network that makes it easy for anyone to securely launch their own blockchain.',
    category: ['Layer 1', 'DA Layer'],
    socials: {
      website: 'https://celestia.org',
      github: 'https://github.com/celestiaorg',
      twitter: 'https://twitter.com/celestia'
    }
  }
} as const

export const CHAIN_CONFIGS = {
  mainnet: {
    name: 'mainnet',
    display_name: 'Mainnet',
    color: {
      text: 'text-mainnet',
      badgeBg: 'bg-mainnet-bg'
    }
  },
  testnet: {
    name: 'testnet',
    display_name: 'Testnet',
    color: {
      text: 'text-testnet',
      badgeBg: 'bg-testnet-bg'
    }
  }
} as const
