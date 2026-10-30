import {
  FEED_TIMEOUT_MS,
  MAX_FEED_BYTES,
  applyHeightRule,
  readFeedJson,
  truncateForLog,
  validateFeedUrl,
  validateSnapshotEntry,
  type ValidSnapshotEntry
} from './validation/feed'
import { checkPublicHost, type Resolver } from './validation/public-host'

const MAX_SKIP_LOGS = 20

export interface FeedReadIo {
  fetch: typeof fetch
  resolve?: Resolver
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${truncateForLog(error.message)}` : truncateForLog(error)
}

// Reads one feed. `read` is true only when the feed was fetched and parsed as a JSON array, so an
// empty list with read true is evidence that the contributor lists nothing, and read false is not.
export async function readFeed(
  url: string,
  registryType: string | undefined,
  io: FeedReadIo = { fetch: (input, init) => fetch(input, init) }
): Promise<{ entries: ValidSnapshotEntry[]; read: boolean }> {
  const failed = { entries: [], read: false }
  const feedUrl = validateFeedUrl(url)
  if (!feedUrl.ok) {
    console.error(`Rejected feed URL ${truncateForLog(url)}: ${feedUrl.reason}`)
    return failed
  }
  const feedHost = new URL(feedUrl.value).hostname
  const hostCheck = await checkPublicHost(feedHost, io.resolve, FEED_TIMEOUT_MS)
  if (!hostCheck.ok) {
    console.error(`Rejected feed host ${feedHost}: ${hostCheck.reason}`)
    return failed
  }

  let raw: unknown
  try {
    const response = await io.fetch(feedUrl.value, {
      redirect: 'error',
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS)
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch snapshots from ${url}`)
    }
    raw = await readFeedJson(response, MAX_FEED_BYTES)
  } catch (error) {
    console.error(`Error fetching snapshots from ${url}: ${describeError(error)}`)
    return failed
  }

  if (!Array.isArray(raw)) {
    console.error(`Rejected feed ${url}: top level is not an array`)
    return failed
  }

  const entries: ValidSnapshotEntry[] = []
  let skipped = 0
  const skip = (index: number, reason: string, value: unknown) => {
    skipped++
    if (skipped <= MAX_SKIP_LOGS) {
      console.warn(`skip ${feedHost} #${index}: ${reason} ${truncateForLog(value)}`)
    }
  }
  const valid: Array<{ index: number; entry: ValidSnapshotEntry }> = []
  raw.forEach((item, index) => {
    const result = validateSnapshotEntry(item, Date.now())
    if (result.ok) valid.push({ index, entry: result.entry })
    else skip(index, result.reason, result.value)
  })
  const { kept, rejected } = applyHeightRule(registryType, valid)
  rejected.forEach(({ index, entry, reason }) => skip(index, reason, entry))
  kept.forEach(({ index, entry }) => {
    const entryHost = new URL(entry.url).hostname
    if (entryHost !== feedHost) {
      console.warn(`Feed ${feedHost} #${index}: download host ${entryHost} differs from feed host`)
    }
    entries.push(entry)
  })
  if (skipped > MAX_SKIP_LOGS) {
    console.warn(`skip ${feedHost}: ${skipped} of ${raw.length} entries skipped in total (first ${MAX_SKIP_LOGS} logged)`)
  }
  return { entries, read: true }
}
