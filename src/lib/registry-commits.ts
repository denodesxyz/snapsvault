// Helpers for reading when a registry file was first committed through the GitHub commits API.

// Page number of rel="last" in a Link header; null when the list has a single page.
export function lastPageFromLink(link: string | null | undefined): number | null {
  if (!link) return null
  for (const part of link.split(',')) {
    if (!/rel="last"/.test(part)) continue
    const match = /[?&]page=(\d+)/.exec(part)
    if (match) return Number(match[1])
  }
  return null
}

// Commit date from one item of the commits API response; null when it is not a valid date.
export function commitDate(item: unknown): Date | null {
  const raw = (item as { commit?: { committer?: { date?: unknown } } } | null)?.commit?.committer?.date
  if (typeof raw !== 'string') return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

// The earliest of several dates; null for none.
export function earliestDate(dates: Array<Date | null>): Date | null {
  const valid = dates.filter((d): d is Date => d !== null)
  if (valid.length === 0) return null
  return new Date(Math.min(...valid.map(d => d.getTime())))
}

export interface RegistryJoinBasis {
  addedAt: Date | null
  paths: string[]
}

export interface RegistryJoinResult {
  addedAt: Date
  paths: string[]
}

// The join date of one contributor, or null when nothing should be stored this run.
// Only a complete registry read may resolve it. The stored basis lists the registry files already
// covered by the stored date; only files outside it are looked up, and the result is the earliest
// of the stored date and the new ones. A file whose history cannot be read leaves the date unresolved.
export async function resolveRegistryJoin(
  stored: RegistryJoinBasis | undefined,
  currentPaths: string[],
  registryComplete: boolean,
  firstCommitDate: (path: string) => Promise<Date | null>
): Promise<RegistryJoinResult | null> {
  if (!registryComplete || currentPaths.length === 0) return null
  const covered = new Set(stored?.addedAt ? stored.paths : [])
  const fresh = [...new Set(currentPaths)].filter(path => !covered.has(path))
  if (fresh.length === 0) return null

  const dates = await Promise.all(fresh.map(firstCommitDate))
  if (dates.some(d => d === null)) return null
  const addedAt = earliestDate([stored?.addedAt ?? null, ...dates])
  if (!addedAt) return null
  return { addedAt, paths: [...new Set([...covered, ...fresh])].sort() }
}

// Two atomic writes for the stored join data. $min cannot be used for the date: Null sorts below
// every Date in BSON order, so it would never replace a stored null. The date filter matches a
// null, a missing or a later value, so the date can only move earlier; paths are only added.
// Null without a resolved date.
export function registryJoinUpdates(name: string, addedAt: Date | null | undefined, paths: string[] | undefined) {
  if (!addedAt) return null
  return {
    date: {
      filter: { name, $or: [{ registryAddedAt: null }, { registryAddedAt: { $gt: addedAt } }] },
      update: { $set: { registryAddedAt: addedAt } }
    },
    paths: {
      filter: { name },
      update: { $addToSet: { registryAddedPaths: { $each: paths ?? [] } } }
    }
  }
}
