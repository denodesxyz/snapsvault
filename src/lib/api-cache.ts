// Short shared cache for the public GET routes. /api/snapshots and /api/networks are also revalidated after every sync.
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120'
