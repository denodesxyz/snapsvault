// Pure helpers for the identity of a stored snapshot. No database imports, so node tests can load it.

export interface IdentityFields {
  chainName: string
  chainId: string
  blockHeight: number
  type: string
  contributorName: string
  downloadUrl: string
}

export interface ProtectedScope {
  chainName: string
  chainId: string
  contributorName?: string
  type?: string
}

// A snapshot without a published height (stored as 0) has no height to tell files apart, so the
// download URL is part of its identity. Every other snapshot is identified without the URL.
export function snapshotIdentityKey(f: IdentityFields): string {
  const base = `${f.chainName}:${f.chainId}:${f.blockHeight}:${f.type}:${f.contributorName}`
  return f.blockHeight === 0 ? `${base}:${f.downloadUrl}` : base
}

export function snapshotUpsertFilter(f: IdentityFields): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    'chain.name': f.chainName,
    chain_id: f.chainId,
    block_height: f.blockHeight,
    type: f.type,
    'contributor.name': f.contributorName
  }
  if (f.blockHeight === 0) filter.download_url = f.downloadUrl
  return filter
}

// The scope to protect from the archive sweep when a feed was not read; null when it was read,
// including a feed that was read and is empty.
export function unreadFeedScope(feedRead: boolean, scope: ProtectedScope): ProtectedScope | null {
  return feedRead ? null : scope
}

interface CurrentCandidate {
  chain: { name: string }
  chain_id: string
  block_height: number
  type: string
  contributor: { name: string }
  time: string
  url?: string
}

// Of the snapshots without a height, only the newest per chain, chain ID, type and contributor is
// current. The rest stay stored and are listed as not current. Ties go to the larger URL.
export function currentSnapshotSet<T extends CurrentCandidate>(snapshots: T[]): Set<T> {
  const current = new Set<T>()
  const newestByGroup = new Map<string, T>()
  for (const s of snapshots) {
    if (s.block_height !== 0) {
      current.add(s)
      continue
    }
    const group = `${s.chain.name}:${s.chain_id}:${s.type}:${s.contributor.name}`
    const best = newestByGroup.get(group)
    if (!best) {
      newestByGroup.set(group, s)
      continue
    }
    const a = new Date(s.time).getTime()
    const b = new Date(best.time).getTime()
    if (a > b || (a === b && (s.url ?? '') > (best.url ?? ''))) newestByGroup.set(group, s)
  }
  for (const s of newestByGroup.values()) current.add(s)
  return current
}

// Filter for the archive sweep. A snapshot stays current when it is in the keep list, or when its
// scope could not be read this run (a failed read gives no evidence that anything was removed).
export function outdatedFilter(
  keepKeys: string[],
  discoveredChainNames?: string[],
  protectedScopes: ProtectedScope[] = []
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    is_current: true,
    $expr: {
      $not: {
        $in: [
          {
            $concat: [
              '$chain.name', ':', '$chain_id', ':',
              { $toString: '$block_height' }, ':', '$type', ':', '$contributor.name',
              { $cond: [{ $eq: ['$block_height', 0] }, { $concat: [':', '$download_url'] }, ''] }
            ]
          },
          keepKeys
        ]
      }
    }
  }
  if (discoveredChainNames) filter['chain.name'] = { $in: discoveredChainNames }
  if (protectedScopes.length > 0) {
    filter.$nor = protectedScopes.map(scope => {
      const clause: Record<string, unknown> = { 'chain.name': scope.chainName, chain_id: scope.chainId }
      if (scope.contributorName) clause['contributor.name'] = scope.contributorName
      if (scope.type) clause.type = scope.type
      return clause
    })
  }
  return filter
}
