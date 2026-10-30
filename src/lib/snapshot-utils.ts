import { SnapshotData } from '@/components/ui/snapshot-card'
import { relativeUrl } from '@/lib/public-names'
import { safeExternalHref } from '@/lib/validation/feed'

export const filterSnapshots = (
  snapshots: SnapshotData[],
  filters: {
    searchQuery?: string
    selectedNetwork?: string
    selectedChain?: string
    selectedType?: string
  }
) => {
  return snapshots.filter(snapshot => {
    const { 
      searchQuery = '', 
      selectedNetwork = 'all', 
      selectedChain = 'all', 
      selectedType = 'all'
    } = filters
    
    const matchesSearch = searchQuery === '' || 
      (snapshot.network?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (snapshot.chain?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (snapshot.type?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (snapshot.contributor?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (snapshot.block_height?.toString() || '').includes(searchQuery)
    
    const matchesNetwork = selectedNetwork === 'all' || (snapshot.network?.name?.toLowerCase() || '') === selectedNetwork.toLowerCase()
    const matchesChain = selectedChain === 'all' || snapshot.chain === selectedChain
    const matchesType = selectedType === 'all' || snapshot.type === selectedType

    return matchesSearch && matchesNetwork && matchesChain && matchesType
  })
}

// Keyed by the unit's first letter, per CONTRIBUTOR-CONTRACT.md's size rule:
// a number followed by B, or K/M/G/T/P optionally followed by B or iB
// (case-insensitive) - e.g. "426Gb", "426G", "1.2T", "3.4 GiB".
const SIZE_UNIT_MULTIPLIERS: Record<string, number> = {
  B: 1,
  K: 1024,
  M: 1024 ** 2,
  G: 1024 ** 3,
  T: 1024 ** 4,
  P: 1024 ** 5,
}

// Normalizes a size value to bytes so values across different units compare
// correctly - a bare parseFloat would rank "1.5TB" below "900GB" since it
// ignores the unit entirely. Accepts everything CONTRIBUTOR-CONTRACT.md's
// size rule allows: a bare 1-15 digit string (raw bytes), a number+unit
// string, or a JS number (legacy contract: treated as GB).
export const parseSizeToBytes = (size: string | number): number => {
  if (typeof size === 'number') {
    return Number.isFinite(size) && size > 0 ? size * SIZE_UNIT_MULTIPLIERS.G : 0
  }
  const trimmed = size.trim()
  if (/^\d{1,15}$/.test(trimmed)) {
    return parseInt(trimmed, 10)
  }
  const match = trimmed.match(/^([\d.]+)\s?([a-zA-Z]+)$/)
  if (!match) return 0
  const value = parseFloat(match[1])
  if (!Number.isFinite(value)) return 0
  const unitLetter = match[2].charAt(0).toUpperCase()
  const multiplier = SIZE_UNIT_MULTIPLIERS[unitLetter] ?? SIZE_UNIT_MULTIPLIERS.G
  return value * multiplier
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const formatFileSize = (size: string | number): string => {
  // "0GB" is the documented fallback for a missing size, not a real zero-byte file
  if (size === '0GB' || size === 0) {
    return 'N/A'
  }

  // If it's already a formatted string like "912Gb", just add space
  if (typeof size === 'string') {
    const match = size.match(/^([\d.]+)\s*([a-zA-Z]+)$/)
    if (match) {
      const value = match[1]
      // any zero-valued size ("0.00GB", "0 TB") is a missing size, same as "0GB"
      if (parseFloat(value) === 0) {
        return 'N/A'
      }
      const unit = match[2].toUpperCase()
      return `${value} ${unit}`
    }
    return size
  }
  
  // Legacy: if it's a number, assume it's in GB
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} TB`
  }
  return `${size.toFixed(2)} GB`
}

export const getContributorAvatarUrl = (contributor: {
  identity?: string
  image?: string
  logo_url?: string
  name?: string
}) => {
  const logoUrl = contributor.logo_url?.trim()
  if (logoUrl && safeExternalHref(logoUrl)) {
    return logoUrl
  }
  
  const image = relativeUrl(contributor.image?.trim() ?? '')
  if (image && ((image.startsWith('/') && !image.startsWith('//') && !/[\\\s]/.test(image)) || safeExternalHref(image))) {
    return image
  }
  
  return '/default-contributor.svg'
}

export const formatRelativeTime = (time: string | number | Date): string => {
  const date = new Date(time)
  const now = new Date()
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`
  }

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`
}

export { formatNextUpdate } from './next-update'
