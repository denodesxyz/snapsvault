// A stored snapshot that left the current set is no longer downloadable when a newer
// snapshot of the same URL exists: stable names such as latest.tar.lz4 now serve that archive.

export interface HistoryAvailabilityInput {
  download_url: string
  time: Date | string
  is_current?: boolean
}

export function isUrlReused(snapshot: HistoryAvailabilityInput, newestTimeByUrl: Map<string, number>): boolean {
  if (snapshot.is_current) return false
  const newest = newestTimeByUrl.get(snapshot.download_url)
  const own = new Date(snapshot.time).getTime()
  return newest !== undefined && Number.isFinite(own) && newest > own
}
