import { NETWORK_DATA } from '@/lib/constants'

// Network panel data derived from the URL alone, shared by the detail page
// and its skeleton so both render the same network block.

const parseLinkUrl = (href: string): URL | null => {
  if (!href || href === '#') return null
  try {
    const url = new URL(href)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

const getWebsiteLabel = (href: string): string | null => {
  return parseLinkUrl(href)?.hostname || null
}

const getHandleLabel = (href: string): string | null => {
  const handle = parseLinkUrl(href)?.pathname.split('/').filter(Boolean)[0]
  return handle ? `@${handle.toLowerCase()}` : null
}

export function getNetworkInfo(network: string) {
  const key = network.toLowerCase()
  const networkName = key.charAt(0).toUpperCase() + key.slice(1)
  const currentNetwork = (Object.hasOwn(NETWORK_DATA, key) ? NETWORK_DATA[key as keyof typeof NETWORK_DATA] : undefined) || {
    name: networkName,
    image: '/default-logo.svg',
    description: `${networkName} blockchain network providing secure and scalable infrastructure.`,
    category: ['Layer 1'],
    socials: {
      website: '#',
      github: '#',
      twitter: '#'
    }
  }

  return {
    currentNetwork,
    websiteLabel: getWebsiteLabel(currentNetwork.socials.website),
    githubLabel: getHandleLabel(currentNetwork.socials.github),
    twitterLabel: getHandleLabel(currentNetwork.socials.twitter),
  }
}
