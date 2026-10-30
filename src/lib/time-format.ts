export type TimeKind = 'datetime' | 'date' | 'time' | 'short'

function render(time: string | number | Date, kind: TimeKind, seconds: boolean, timeZone?: string): string {
  const date = new Date(time)
  if (kind === 'short') return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone })
  const day = kind === 'time' ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone })
  if (kind === 'date') return day
  const clock = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' as const } : {}),
    hour12: false,
    timeZone,
  })
  return kind === 'time' ? clock : `${day}, ${clock}`
}

// The moment in the viewer's time zone.
export function formatLocal(time: string | number | Date, kind: TimeKind = 'datetime', seconds = false): string {
  return render(time, kind, seconds)
}

// The same moment in UTC, always labelled.
export function formatUtc(time: string | number | Date, kind: TimeKind = 'datetime', seconds = false): string {
  return `${render(time, kind, seconds, 'UTC')}${kind === 'short' ? '' : ' UTC'}`
}
