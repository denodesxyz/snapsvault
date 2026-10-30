import type { CliData, CliRow } from '@/lib/cli-sim'
import type { Endpoint } from '@/components/api-explorer'
import { MARKET_URL } from '@/lib/links'
import { CLI_LATEST_PATH, type Network, type CliSnapshot, type Contributor, type Snapshot } from '@/lib/feed'

const fmtTime = (iso: string) => `${iso.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UTC`
const fileSize = (s: CliSnapshot) => s.file_size || s.size

// Shapes the CLI endpoint rows the way snapsos.sh lists them.
export const toCliData = (networks: Network[] | null, rows: CliSnapshot[] | null): CliData | null => {
  if (!networks || !rows) return null
  const byKey: Record<string, CliRow[]> = {}
  for (const r of rows) {
    const key = `${r.chain_id}|${r.type}`
    ;(byKey[key] ??= []).push({
      height: String(r.height),
      size: fileSize(r),
      time: fmtTime(r.time),
      contributor: r.contributor.name,
      filename: r.filename ?? r.download_url.split('/').pop() ?? 'snapshot',
      download_url: r.download_url,
      sha256: r.checksum?.sha256,
    })
  }
  const cliChains = networks
    .filter((n) => n.network === 'Celestia')
    .map((n) => ({ chain_id: n.chain_id, chain: n.chains[0] ?? 'mainnet', types: n.types.filter((t) => byKey[`${n.chain_id}|${t}`]?.length), label: n.display_name }))
    .filter((c) => c.types.length > 0)
  return cliChains.length ? { chains: cliChains, rows: byKey } : null
}

// Pretty JSON with arrays of short values kept on one line, so a response fits the panel.
const compactJson = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(/\[\n\s+((?:"[^"\n]*"|-?[\d.]+|true|false|null)(?:,\n\s+(?:"[^"\n]*"|-?[\d.]+|true|false|null))*)\n\s+\]/g, (_, inner: string) => `[${inner.replace(/,\n\s+/g, ', ')}]`)

const pick = (obj: Record<string, unknown> | undefined, keys: string[]) => {
  const out: Record<string, unknown> = {}
  if (!obj) return out
  for (const k of keys) if (k in obj) out[k] = obj[k]
  return out
}

export const toEndpoints = (networks: Network[] | null, snapshots: Snapshot[] | null, latest: Record<string, unknown> | null): Endpoint[] => {
  const list: Endpoint[] = []
  if (networks) {
    list.push({
      label: 'networks',
      path: `${MARKET_URL}/api/networks`,
      json: compactJson({ success: true, total: networks.length, data: networks.map((n) => pick(n as unknown as Record<string, unknown>, ['network', 'chain_id', 'chains', 'snapshot_count', 'contributors', 'types', 'latest_snapshot'])) }),
    })
  }
  if (snapshots?.length) {
    const s = snapshots[0]
    list.push({
      label: 'snapshots',
      path: `${MARKET_URL}/api/snapshots?network=celestia`,
      json: compactJson({ success: true, data: [{ chain_id: s.chain_id, chain: s.chain, type: s.type, block_height: s.block_height, size: s.size, time: s.time, contributor: { name: s.contributor.name }, url: s.url, ...(s.checksum?.sha256 ? { checksum: { sha256: s.checksum.sha256 } } : {}) }] }),
    })
  }
  if (latest) {
    const c = latest.contributor as Record<string, unknown> | undefined
    list.push({
      label: 'cli/latest',
      path: `${MARKET_URL}${CLI_LATEST_PATH}`,
      json: compactJson({ success: true, data: { ...pick(latest, ['chain_id', 'chain', 'height', 'type', 'file_size', 'download_url', 'filename', 'time']), contributor: { name: c?.name } } }),
    })
  }
  return list
}

export const uniqueContributors = (snapshots: Snapshot[] | null): Contributor[] =>
  snapshots ? Array.from(new Map(snapshots.map((s) => [s.contributor.name, s.contributor])).values()) : []

export const pickShowcaseSnapshot = (snapshots: Snapshot[] | null): Snapshot | null =>
  snapshots?.find((x) => x.contributor.name === 'deNodes' && x.chain_id === 'celestia') ?? snapshots?.[0] ?? null
