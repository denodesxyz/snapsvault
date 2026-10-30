export function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Day and short month from a fixed table, so every engine prints the same ("25 Sep").
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

export const SERIES_COUNT = 12

// One color per contributor in both themes. Names are sorted and spread around the
// hue wheel in steps of 5 slots, so up to 12 contributors never share a color.
export function seriesPalette(names: string[]): Record<string, string> {
  const sorted = [...new Set(names)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  return Object.fromEntries(sorted.map((name, i) => [name, `var(--series-${((i * 5) % SERIES_COUNT) + 1})`]))
}

export function formatPct(value: number | null): string {
  return value === null ? 'N/A' : `${value}%`
}

export function formatInterval(hours: number | null): string {
  if (hours === null) return ''
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${hours} h`
  return `${Math.round((hours / 24) * 10) / 10} d`
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return 'N/A'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${Math.round(ms / 100) / 10} s`
  return `${Math.round(ms / 6000) / 10} min`
}
