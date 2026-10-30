const HOURS_BY_PERIOD: Record<string, number> = {
  '1h': 1, '2h': 2, '4h': 4, '6h': 6, '8h': 8, '12h': 12,
  '1d': 24, '2d': 48, '3d': 72, '1w': 168, '2w': 336, '1m': 720
}

// Average of the known periods. Empty and unknown periods are left out; null when none is known.
export function averagePeriodHours(periods: string[]): number | null {
  const known = periods
    .map(period => HOURS_BY_PERIOD[period])
    .filter((hours): hours is number => Number.isFinite(hours))
  if (known.length === 0) return null
  return known.reduce((sum, hours) => sum + hours, 0) / known.length
}
