import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

// A feed host is checked after DNS resolution: a public-looking name that resolves to a private,
// loopback, link-local, carrier-grade NAT or unique local address is refused before any request.
// The request itself resolves the name again, so a DNS answer that changes in between is not covered.

export type Resolver = (host: string) => Promise<Array<{ address: string }>>

const defaultResolver: Resolver = host => lookup(host, { all: true })

// IPv4 ranges that are not public: [network, prefix length].
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
]

function v4ToNumber(address: string): number | null {
  const parts = address.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null
    value = value * 256 + Number(part)
  }
  return value
}

function isBlockedV4(address: string): boolean {
  const value = v4ToNumber(address)
  if (value === null) return true
  return BLOCKED_V4.some(([network, prefix]) => {
    const base = v4ToNumber(network) as number
    const size = 2 ** (32 - prefix)
    return Math.floor(value / size) === Math.floor(base / size)
  })
}

// Eight 16-bit groups of an IPv6 address, or null when it does not parse.
function v6Groups(address: string): number[] | null {
  let text = address.split('%')[0].toLowerCase()
  const tail = text.lastIndexOf(':')
  if (text.includes('.')) {
    const v4 = v4ToNumber(text.slice(tail + 1))
    if (v4 === null) return null
    text = `${text.slice(0, tail + 1)}${Math.floor(v4 / 65536).toString(16)}:${(v4 % 65536).toString(16)}`
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const parse = (part: string) => (part === '' ? [] : part.split(':'))
  const head = parse(halves[0])
  const rest = halves.length === 2 ? parse(halves[1]) : []
  const missing = 8 - head.length - rest.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest]
  if (groups.length !== 8) return null
  const numbers = groups.map(group => (/^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN))
  return numbers.some(Number.isNaN) ? null : numbers
}

function isBlockedV6(address: string): boolean {
  const g = v6Groups(address)
  if (!g) return true
  const embeddedV4 = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`
  const first96Zero = g.slice(0, 6).every(group => group === 0)
  if (first96Zero) return true // :: , ::1 and IPv4-compatible addresses
  if (g.slice(0, 5).every(group => group === 0) && g[5] === 0xffff) return isBlockedV4(embeddedV4) // IPv4-mapped
  if (g.slice(0, 4).every(group => group === 0) && g[4] === 0xffff && g[5] === 0) return isBlockedV4(embeddedV4) // IPv4-translated ::ffff:0:0:0/96
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(group => group === 0)) return isBlockedV4(embeddedV4) // NAT64
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return true // local-use NAT64 64:ff9b:1::/48
  if (g[0] === 0x2002) return true // 6to4 2002::/16, embeds an IPv4 address we do not unwrap
  if (g[0] === 0x2001 && g[1] === 0) return true // Teredo 2001::/32
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true // discard-only 100::/64
  if ((g[0] & 0xfe00) === 0xfc00) return true // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true // site-local fec0::/10
  if ((g[0] & 0xff00) === 0xff00) return true // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true // documentation
  return false
}

export function isPublicAddress(address: string): boolean {
  const kind = isIP(address)
  if (kind === 4) return !isBlockedV4(address)
  if (kind === 6) return !isBlockedV6(address)
  return false
}

// Resolves the host (within timeoutMs) and accepts it only when it has at least one address and every address is public.
export async function checkPublicHost(
  host: string,
  resolve: Resolver = defaultResolver,
  timeoutMs: number = 10_000
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let answers: Array<{ address: string }>
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // dns.lookup has no timeout of its own, so a slow resolver would hold the sync.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('lookup timed out')), timeoutMs)
    })
    answers = await Promise.race([resolve(host), timeout])
  } catch (error) {
    const timedOut = error instanceof Error && error.message === 'lookup timed out'
    return { ok: false, reason: timedOut ? 'host lookup timed out' : 'host does not resolve' }
  } finally {
    clearTimeout(timer)
  }
  if (answers.length === 0) return { ok: false, reason: 'host has no address' }
  if (answers.some(answer => !isPublicAddress(answer.address))) {
    return { ok: false, reason: 'host resolves to a non-public address' }
  }
  return { ok: true }
}
