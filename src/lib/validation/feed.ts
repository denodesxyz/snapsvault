// Validation for contributor-published data (registry files and snapshots.json feeds).
// Pure module: no server-only imports, safe to use from client components.

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string }

// MAX_URL_LENGTH and validateFilename are exported for the registry parity test (snapsvault-registry/test/parity.test.mjs).
export const MAX_URL_LENGTH = 2048
export const MAX_FEED_BYTES = 1_048_576
export const MAX_FEED_ENTRIES = 500
export const FEED_TIMEOUT_MS = 10_000

const URL_CHARS = /^[A-Za-z0-9._~:/?&=%+,@-]+$/
const URL_CHARS_WITH_FRAGMENT = /^[A-Za-z0-9._~:/?&=%+,@#-]+$/
const DNS_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
const TLD = /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/
const BLOCKED_SUFFIXES = ['.local', '.localhost', '.internal', '.localdomain', '.lan', '.home.arpa']
const FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/
const SIZE = /^\d+(\.\d+)? ?(B|[KMGTP](i?B)?)$/i
const SIZE_DIGITS = /^\d{1,15}$/
const RAW_AUTHORITY = /^[A-Za-z0-9.-]+$/
const REGISTRY_FILE = /^[A-Za-z0-9._-]{1,100}\.json$/
const HEIGHT = /^\d{1,15}$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/
const SHA256 = /^[0-9a-fA-F]{64}$/
const LABEL = /^[A-Za-z0-9._-]{1,32}$/
const IDENTITY = /^[0-9A-Fa-f]{16}$/
const EMAIL = /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/
const DISCORD = /^[A-Za-z0-9._#-]{2,40}$/
const DIR_NAME = /^[A-Za-z0-9._-]{1,64}$/
const NETWORK_PARAM = /^[A-Za-z0-9._-]{1,64}$/
// C0/C1 controls, plus Unicode bidi-override/isolate controls and invisible-formatting
// characters (zero-width space/joiner/non-joiner, BOM) that can spoof a display name.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g
const MIN_DATE = Date.UTC(2019, 0, 1)
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function fail<T>(reason: string): Result<T> {
  return { ok: false, reason }
}

function checkUrl(raw: unknown, allowFragment: boolean): Result<URL> {
  if (typeof raw !== 'string') return fail(`url is ${raw === null ? 'null' : typeof raw}, not a string`)
  if (raw.length === 0) return fail('url is empty')
  if (raw.length > MAX_URL_LENGTH) return fail(`url longer than ${MAX_URL_LENGTH} characters`)
  if (!(allowFragment ? URL_CHARS_WITH_FRAGMENT : URL_CHARS).test(raw)) return fail('url contains disallowed characters')
  if (!raw.startsWith('https://')) return fail('url does not start with https://')
  const authority = raw.slice('https://'.length).split(/[/?#]/, 1)[0]
  if (!RAW_AUTHORITY.test(authority)) return fail('url authority may only contain letters, digits, dots and hyphens')

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return fail('url does not parse')
  }
  if (url.protocol !== 'https:') return fail(`url protocol ${url.protocol} is not https:`)
  if (url.username !== '' || url.password !== '') return fail('url contains credentials')
  if (url.port !== '') return fail('url has a non-default port')
  if (!allowFragment && url.hash !== '') return fail('url has a fragment')

  const host = url.hostname
  if (host.endsWith('.')) return fail('url host has a trailing dot')
  if (host === 'localhost') return fail('url host is localhost')
  if (BLOCKED_SUFFIXES.some(suffix => host.endsWith(suffix))) return fail('url host is a local or internal name')
  const labels = host.split('.')
  if (labels.length < 2) return fail('url host is not a DNS name')
  if (!labels.every(label => DNS_LABEL.test(label))) return fail('url host is not a DNS name')
  if (!TLD.test(labels[labels.length - 1])) return fail('url host is not a DNS name (IP literal or numeric TLD)')
  return { ok: true, value: url }
}

// https URL for feeds and snapshot downloads: no fragment, public DNS host, default port.
export function validateHttpsUrl(raw: unknown): Result<string> {
  const r = checkUrl(raw, false)
  return r.ok ? { ok: true, value: raw as string } : r
}

export function validateFeedUrl(raw: unknown): Result<string> {
  return validateHttpsUrl(raw)
}

// Contributor links (website, x, telegram, logo): same rules, `#` fragment allowed.
export function validateContributorLink(raw: unknown): Result<string> {
  const r = checkUrl(raw, true)
  return r.ok ? { ok: true, value: raw as string } : r
}

export function safeExternalHref(raw: unknown): string | null {
  const r = checkUrl(raw, true)
  return r.ok ? r.value.href : null
}

export function safeMailtoHref(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length <= 254 && EMAIL.test(raw) ? `mailto:${raw}` : null
}

// Discord is a plain username; it is shown as text and never turned into a link.
export function safeDiscordName(raw: unknown): string | null {
  return typeof raw === 'string' && DISCORD.test(raw) ? raw : null
}

// Avatar proxy path for a Keybase identity (16 hex characters); anything else gets the default avatar.
export function keybaseAvatarPath(identity: unknown): string {
  return typeof identity === 'string' && IDENTITY.test(identity) ? `/api/keybase-avatar/${identity}` : '/default-contributor.svg'
}

// `network` query parameter: absent is allowed (null), otherwise 1-64 of [A-Za-z0-9._-].
export function parseNetworkParam(raw: string | null): { ok: true; value: string | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null }
  return NETWORK_PARAM.test(raw) ? { ok: true, value: raw } : { ok: false }
}

export function validateFilename(raw: unknown): Result<string> {
  if (typeof raw !== 'string') return fail(`filename is ${raw === null ? 'null' : typeof raw}, not a string`)
  if (!FILENAME.test(raw) || raw.includes('..')) return fail('filename has a disallowed form')
  return { ok: true, value: raw }
}

export function safeFilenameFromUrl(url: unknown): string | null {
  const r = checkUrl(url, false)
  if (!r.ok) return null
  const segment = r.value.pathname.split('/').pop() || ''
  const f = validateFilename(segment)
  return f.ok ? f.value : null
}

// Contributor file name from the GitHub listing, e.g. `deNodes.json`.
export function validateRegistryFileName(raw: unknown): Result<string> {
  if (typeof raw !== 'string' || !REGISTRY_FILE.test(raw) || /^\.+$/.test(raw.slice(0, -'.json'.length))) {
    return fail('registry file name has a disallowed form')
  }
  return { ok: true, value: raw }
}

export function validateDirectoryName(raw: unknown): Result<string> {
  if (typeof raw !== 'string' || !DIR_NAME.test(raw)) return fail('directory name has a disallowed form')
  return { ok: true, value: raw }
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function truncateForLog(value: unknown, max = 100): string {
  let s: string
  try {
    s = JSON.stringify(value) ?? String(value)
  } catch {
    s = String(value)
  }
  return s.length > max ? `${s.slice(0, max)}...` : s
}

export interface ValidSnapshotEntry {
  url: string
  filename: string
  size?: string | number
  latest_block_height?: number
  creation_date?: string
  sha256sum?: string
  type?: string
  period?: string
  tx_index?: boolean | string
}

export type EntryResult = { ok: true; entry: ValidSnapshotEntry } | { ok: false; reason: string; value: unknown }

// null and "" count as absent, like a missing key (the pre-validation mapping used `||` fallbacks).
function isPresent(v: unknown): boolean {
  return v !== undefined && v !== null && v !== ''
}

function checkSize(v: unknown): Result<string | number> {
  if (typeof v === 'number') {
    return Number.isFinite(v) && v > 0 ? { ok: true, value: v } : fail('size is not a positive finite number')
  }
  if (typeof v === 'string' && v.length <= 24 && (SIZE.test(v) || SIZE_DIGITS.test(v))) {
    // Leading numeric magnitude only; the unit doesn't matter for a zero check since
    // 0 of any unit is 0 bytes (e.g. "0.5GB" must still pass).
    return parseFloat(v) > 0 ? { ok: true, value: v } : fail('size is not a positive value')
  }
  return fail('size has a disallowed form')
}

function checkHeight(v: unknown, field: string): Result<number> {
  if (typeof v === 'number') {
    return Number.isSafeInteger(v) && v >= 0 ? { ok: true, value: v } : fail(`${field} is not a safe non-negative integer`)
  }
  if (typeof v === 'string' && HEIGHT.test(v)) return { ok: true, value: Number(v) }
  return fail(`${field} has a disallowed form`)
}

function checkDate(v: unknown, field: string, now: number): Result<string> {
  const m = typeof v === 'string' ? ISO_DATE.exec(v) : null
  if (typeof v !== 'string' || !m) return fail(`${field} is not an ISO 8601 date with a timezone`)
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return fail(`${field} is not a valid date`)
  const [y, mo, d, h, mi, sec] = [m[1], m[2], m[3], m[4], m[5], m[7] ?? '0'].map(Number)
  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi, sec))
  if (wall.getUTCFullYear() !== y || wall.getUTCMonth() !== mo - 1 || wall.getUTCDate() !== d ||
      wall.getUTCHours() !== h || wall.getUTCMinutes() !== mi || wall.getUTCSeconds() !== sec) {
    return fail(`${field} is not a real calendar date and time`)
  }
  if (t > now + ONE_DAY_MS) return fail(`${field} is in the future`)
  if (t < MIN_DATE) return fail(`${field} is before 2019-01-01`)
  return { ok: true, value: v }
}

function checkSha(v: unknown, field: string): Result<string> {
  if (typeof v !== 'string' || !SHA256.test(v)) return fail(`${field} is not 64 hex characters`)
  return { ok: true, value: v.toLowerCase() }
}

function checkLabel(v: unknown, field: string): Result<string> {
  if (typeof v !== 'string' || !LABEL.test(v)) return fail(`${field} has a disallowed form`)
  return { ok: true, value: v }
}

function checkTxIndex(v: unknown): Result<boolean | string> {
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return { ok: true, value: v }
  return fail('tx_index is not a boolean or "true"/"false"')
}

// Validates one feed entry. A present-but-invalid field rejects the entry; absent optional fields stay absent.
// Legacy aliases are normalized with the same precedence the mapping used before validation existed.
export function validateSnapshotEntry(raw: unknown, now: number = Date.now()): EntryResult {
  const reject = (reason: string, value: unknown): EntryResult => ({ ok: false, reason, value })
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return reject('entry is not an object', raw)
  const e = raw as Record<string, unknown>

  const rawUrl = isPresent(e.url) ? e.url : e.download_url
  if (!isPresent(rawUrl)) return reject('url is missing', raw)
  const url = validateHttpsUrl(rawUrl)
  if (!url.ok) return reject(url.reason, rawUrl)

  let filename: string
  if (isPresent(e.filename)) {
    const f = validateFilename(e.filename)
    if (!f.ok) return reject(f.reason, e.filename)
    filename = f.value
  } else {
    const derived = safeFilenameFromUrl(url.value)
    if (!derived) return reject('no valid filename in url path', url.value)
    filename = derived
  }

  const entry: ValidSnapshotEntry = { url: url.value, filename }

  if (isPresent(e.size)) {
    const s = checkSize(e.size)
    if (!s.ok) return reject(s.reason, e.size)
    entry.size = s.value
  }

  let height: number | undefined
  for (const field of ['latest_block_height', 'block_height', 'height']) {
    if (!isPresent(e[field])) continue
    const h = checkHeight(e[field], field)
    if (!h.ok) return reject(h.reason, e[field])
    height = height !== undefined ? height : h.value
  }
  if (height !== undefined) entry.latest_block_height = height

  let date: string | undefined
  for (const field of ['creation_date', 'time']) {
    if (!isPresent(e[field])) continue
    const d = checkDate(e[field], field, now)
    if (!d.ok) return reject(d.reason, e[field])
    date = date || d.value
  }
  if (date) entry.creation_date = date

  let sha: string | undefined
  if (isPresent(e.sha256sum)) {
    const s = checkSha(e.sha256sum, 'sha256sum')
    if (!s.ok) return reject(s.reason, e.sha256sum)
    sha = s.value
  }
  if (isPresent(e.checksum)) {
    const c = e.checksum
    if (typeof c !== 'object' || Array.isArray(c)) return reject('checksum is not an object', c)
    const legacy = (c as Record<string, unknown>).sha256
    if (isPresent(legacy)) {
      const s = checkSha(legacy, 'checksum.sha256')
      if (!s.ok) return reject(s.reason, legacy)
      sha = sha || s.value
    }
  }
  if (sha) entry.sha256sum = sha

  for (const field of ['type', 'period'] as const) {
    if (!isPresent(e[field])) continue
    const l = checkLabel(e[field], field)
    if (!l.ok) return reject(l.reason, e[field])
    entry[field] = l.value
  }

  if (isPresent(e.tx_index)) {
    const t = checkTxIndex(e.tx_index)
    if (!t.ok) return reject(t.reason, e.tx_index)
    entry.tx_index = t.value
  }

  return { ok: true, entry }
}

// Type used for one feed: the registry type, else the type of the newest entry (by creation_date).
export function feedEffectiveType(registryType: string | undefined, entries: ValidSnapshotEntry[]): string {
  if (registryType) return registryType
  const newest = [...entries].sort((a, b) => new Date(b.creation_date || 0).getTime() - new Date(a.creation_date || 0).getTime())[0]
  return newest?.type || ''
}

// Height 0 means "from genesis" and is only meaningful for an archive snapshot. The sync stores a
// missing height as 0, so the rule applies to the height the marketplace lists, not only an explicit 0.
// Same rule and wording as the registry validator (scripts/validate.mjs in snapsvault-registry).
export function checkHeightZero(entry: { latest_block_height?: number }, effectiveType: string): { ok: boolean; reason?: string } {
  if (effectiveType === 'archive') return { ok: true }
  const type = effectiveType ? `"${effectiveType}"` : 'not set'
  if (entry.latest_block_height === undefined) {
    return { ok: false, reason: `has no latest_block_height, which the marketplace stores as height 0, but the snapshot type is ${type}; height 0 is allowed only for type "archive"` }
  }
  if (entry.latest_block_height === 0) {
    return { ok: false, reason: `latest_block_height is 0 but the snapshot type is ${type}; height 0 is allowed only for type "archive"` }
  }
  return { ok: true }
}

// Last line of defence before a write: no path may store height 0 (or a non-integer height) for a type other than archive.
export function assertStorableHeight(type: string, height: unknown): void {
  if (type === 'archive') return
  if (typeof height !== 'number' || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error(`block height ${String(height)} is not storable for snapshot type "${type}"; height 0 is allowed only for type "archive"`)
  }
}

export interface HeightRuleItem { index: number; entry: ValidSnapshotEntry }

// The sync step: derive the feed type and split validated entries into kept and rejected by the height rule.
export function applyHeightRule(registryType: string | undefined, items: HeightRuleItem[]): { kept: HeightRuleItem[]; rejected: Array<HeightRuleItem & { reason: string }> } {
  const effectiveType = feedEffectiveType(registryType, items.map(i => i.entry))
  const kept: HeightRuleItem[] = []
  const rejected: Array<HeightRuleItem & { reason: string }> = []
  for (const item of items) {
    const zero = checkHeightZero(item.entry, effectiveType || item.entry.type || '')
    if (zero.ok) kept.push(item)
    else rejected.push({ ...item, reason: zero.reason ?? 'block height is not valid for this snapshot type' })
  }
  return { kept, rejected }
}

export interface ValidContributor {
  name: string
  email?: string
  discord?: string
  telegram?: string
  x?: string
  description?: string
  website?: string
  identity?: string
  logoUrl?: string
}

export type ContributorResult =
  | { ok: true; contributor: ValidContributor; dropped: Array<{ field: string; reason: string; value: unknown }> }
  | { ok: false; reason: string; value: unknown }

// Validates the `contributor` object of a registry file. An invalid name rejects it;
// invalid optional fields are dropped and reported.
export function validateContributor(raw: unknown): ContributorResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'contributor is not an object', value: raw }
  }
  const c = raw as Record<string, unknown>
  const name = typeof c.name === 'string' ? c.name.trim() : null
  if (name === null || name.length < 1 || name.length > 64 || name.replace(CONTROL_CHARS, '') !== name) {
    return { ok: false, reason: 'contributor name is missing or has a disallowed form', value: c.name }
  }

  const contributor: ValidContributor = { name }
  const dropped: Array<{ field: string; reason: string; value: unknown }> = []
  const take = (field: keyof ValidContributor, check: (v: unknown) => Result<string>) => {
    if (!isPresent(c[field])) return
    const r = check(c[field])
    if (r.ok) contributor[field] = r.value
    else dropped.push({ field, reason: r.reason, value: c[field] })
  }

  take('website', validateContributorLink)
  take('x', validateContributorLink)
  take('telegram', validateContributorLink)
  take('logoUrl', validateContributorLink)
  take('identity', v => (typeof v === 'string' && IDENTITY.test(v) ? { ok: true, value: v } : fail('identity is not 16 hex characters')))
  take('email', v => (typeof v === 'string' && v.length <= 254 && EMAIL.test(v) ? { ok: true, value: v } : fail('email has a disallowed form')))
  take('discord', v => (typeof v === 'string' && DISCORD.test(v) ? { ok: true, value: v } : fail('discord has a disallowed form')))
  take('description', v =>
    typeof v === 'string' && v.length <= 500 ? { ok: true, value: v.replace(CONTROL_CHARS, ' ') } : fail('description is not a string of at most 500 characters')
  )

  return { ok: true, contributor, dropped }
}

export interface ValidSnapshotEndpoint {
  snapshots: string
  period?: string
  type?: string
  tx_index?: string | boolean
}

// Validates one `snapshots[]` element of a registry file; any invalid field rejects the configuration.
export function validateSnapshotEndpoint(raw: unknown): Result<ValidSnapshotEndpoint> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('snapshot endpoint is not an object')
  const e = raw as Record<string, unknown>
  if (!isPresent(e.snapshots)) return fail('feed url is missing')
  const feed = validateFeedUrl(e.snapshots)
  if (!feed.ok) return fail(`feed ${feed.reason}`)
  const endpoint: ValidSnapshotEndpoint = { snapshots: feed.value }
  for (const field of ['type', 'period'] as const) {
    if (!isPresent(e[field])) continue
    const l = checkLabel(e[field], field)
    if (!l.ok) return l
    endpoint[field] = l.value
  }
  if (isPresent(e.tx_index)) {
    const t = checkTxIndex(e.tx_index)
    if (!t.ok) return t
    endpoint.tx_index = t.value
  }
  return { ok: true, value: endpoint }
}

// Reads a response body with a running byte count.
// Throws above maxBytes (checked on Content-Length first, then while streaming).
export async function readCappedBytes(response: Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = response.headers.get('content-length')
  if (declared !== null && Number(declared) > maxBytes) {
    throw new Error(`Content-Length ${declared} exceeds ${maxBytes} bytes`)
  }
  if (!response.body) throw new Error('response has no body')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new Error(`body exceeds ${maxBytes} bytes`)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

// The capped body parsed as JSON. Throws above maxBytes or on invalid JSON.
export async function readFeedJson(response: Response, maxBytes: number = MAX_FEED_BYTES): Promise<unknown> {
  const bytes = await readCappedBytes(response, maxBytes)
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
