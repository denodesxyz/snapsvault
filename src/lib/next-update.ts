const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const OVERDUE_GRACE_MS = 15 * MINUTE_MS

// null when the period is empty or not a recognisable duration: there is no honest next update then.
const periodToMs = (period: string): number | null => {
  const match = period.match(/(\d+)\s*(h|hours?|d|days?|w|weeks?|m|minutes?)/i)
  if (!match) return null

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()

  if (unit.startsWith('w')) return value * 7 * DAY_MS
  if (unit.startsWith('d')) return value * DAY_MS
  if (unit.startsWith('h')) return value * HOUR_MS
  if (unit.startsWith('m')) return value * MINUTE_MS
  return null
}

// "~30 min" (floored to 5), "~3 h", "~2 d"; the span is always at least 5 minutes here.
const approx = (ms: number): string => {
  if (ms < HOUR_MS) return `~${Math.floor(ms / MINUTE_MS / 5) * 5} min`
  if (ms < DAY_MS) return `~${Math.round(ms / HOUR_MS)} h`
  return `~${Math.round(ms / DAY_MS)} d`
}

export const formatNextUpdate = (timestamp: number, period: string, now: number = Date.now()): string | null => {
  const periodMs = periodToMs(period)
  if (periodMs === null || periodMs <= 0) return null
  const diff = timestamp + periodMs - now

  if (diff > 0) {
    return diff < 5 * MINUTE_MS ? 'Next in a few min' : `Next in ${approx(diff)}`
  }
  if (-diff <= OVERDUE_GRACE_MS) return 'Next in a few min'
  return `Overdue ${approx(-diff)}`
}
