'use client'

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'

export interface SnapshotData {
  block_height: number
  time: string
  size: string | number
  url: string
  network: {
    name: string
    display_name: string
    image: string
  }
  chain: string
  chain_id: string
  type: string
  contributor: {
    name: string
    image: string
    logo_url?: string
    website?: string
    description?: string
    email?: string
    discord?: string
    telegram?: string
    x?: string
    identity?: string
  }
  period: string
  tx_index: string
  checksum?: {
    sha256?: string
    md5?: string
  }
  compression?: string
  instructions?: string
  is_available?: boolean
  is_unavailable?: boolean
  unavailable_reason?: string
}

// The JSON body of GET /api/snapshots (also rendered on the server).
export interface SnapshotsPayload {
  data?: SnapshotData[]
  last_updated?: string | null
}

export const LOAD_ERROR_MESSAGE = 'Unable to load snapshots'
export const REFRESH_ERROR_MESSAGE = 'Could not refresh'

export interface SnapshotsFeedState {
  snapshots: SnapshotData[]
  lastUpdated: string | null
  // true once a response (possibly empty) has been received or seeded
  loaded: boolean
  // first load only; background refreshes use `refreshing`
  loading: boolean
  refreshing: boolean
  // set only when nothing has loaded; a failed refresh sets refreshError instead
  error: string | null
  refreshError: string | null
}

interface FetchResponseLike {
  ok: boolean
  status: number
  json(): Promise<unknown>
}
type FetchLike = (url: string, init: { signal: AbortSignal }) => Promise<FetchResponseLike>

const EMPTY_STATE: SnapshotsFeedState = {
  snapshots: [],
  lastUpdated: null,
  loaded: false,
  loading: false,
  refreshing: false,
  error: null,
  refreshError: null,
}

function stateFromPayload(payload: SnapshotsPayload): SnapshotsFeedState {
  return {
    ...EMPTY_STATE,
    snapshots: Array.isArray(payload.data) ? payload.data : [],
    lastUpdated: payload.last_updated ?? null,
    loaded: true,
  }
}

// One feed per query string, kept for the whole tab session so a remount
// (client navigation, Back) starts from the data already on screen.
// Framework-free so the request lifecycle can be tested without React.
export class SnapshotsFeed {
  url: string
  lastFetchAt = 0
  state: SnapshotsFeedState = EMPTY_STATE
  listeners = new Set<() => void>()
  controller: AbortController | null = null
  inflight: Promise<void> | null = null
  requestId = 0
  fetchImpl: FetchLike
  now: () => number

  constructor(url: string, options: { fetch?: FetchLike; now?: () => number } = {}) {
    this.url = url
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init))
    this.now = options.now ?? (() => Date.now())
  }

  getState = (): SnapshotsFeedState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.abort()
    }
  }

  setState(patch: Partial<SnapshotsFeedState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }

  // Server-rendered data. Ignored when the feed already holds newer data.
  seed(payload: SnapshotsPayload) {
    const incoming = payload.last_updated ?? null
    const current = this.state.lastUpdated
    if (this.state.loaded && current && (!incoming || current >= incoming)) return
    // Called during render: replace the state without notifying, then let
    // other subscribers catch up after the render.
    this.state = { ...stateFromPayload(payload), refreshing: this.state.refreshing }
    this.lastFetchAt = this.now()
    queueMicrotask(() => this.listeners.forEach(listener => listener()))
  }

  load({ force = false }: { force?: boolean } = {}): Promise<void> {
    if (this.inflight && !force) return this.inflight

    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller
    const id = ++this.requestId

    this.setState(this.state.loaded ? { refreshing: true } : { loading: true, error: null })

    const run = (async () => {
      try {
        const response = await this.fetchImpl(this.url, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as SnapshotsPayload & { error?: unknown }
        if (result?.error) throw new Error(String(result.error))
        if (id !== this.requestId) return
        this.lastFetchAt = this.now()
        // A cached response can be older than the data on screen; keep the data.
        const incoming = result?.last_updated ?? null
        const current = this.state.lastUpdated
        if (current && (!incoming || incoming < current)) {
          this.setState({ refreshing: false, refreshError: null })
          return
        }
        this.setState(stateFromPayload(result))
      } catch (err) {
        if (id !== this.requestId || controller.signal.aborted) return
        console.error('Error fetching snapshots:', err)
        this.lastFetchAt = this.now()
        this.setState(this.state.loaded
          ? { refreshing: false, refreshError: REFRESH_ERROR_MESSAGE }
          : { loading: false, error: LOAD_ERROR_MESSAGE })
      } finally {
        if (id === this.requestId) {
          this.inflight = null
          this.controller = null
        }
      }
    })()

    this.inflight = run
    return run
  }

  // Fetch when nothing is loaded yet or the data is older than maxAgeMs.
  ensureFresh(maxAgeMs: number): Promise<void> | undefined {
    if (!this.state.loaded || this.now() - this.lastFetchAt >= maxAgeMs) return this.load()
    return undefined
  }

  startPolling(intervalMs: number, isHidden: () => boolean): () => void {
    const timer = setInterval(() => {
      if (!isHidden()) void this.load()
    }, intervalMs)
    return () => clearInterval(timer)
  }

  abort() {
    if (!this.controller) return
    this.requestId++
    this.controller.abort()
    this.controller = null
    this.inflight = null
    this.setState({ loading: false, refreshing: false })
  }
}

const feeds = new Map<string, SnapshotsFeed>()

function getSnapshotsFeed(url: string): SnapshotsFeed {
  let feed = feeds.get(url)
  if (!feed) {
    feed = new SnapshotsFeed(url)
    feeds.set(url, feed)
  }
  return feed
}

const isDocumentHidden = () => document.visibilityState === 'hidden'

interface UseSnapshotsOptions {
  network?: string
  chain?: string
  autoRefresh?: boolean
  refreshInterval?: number
  // Server-rendered payload; when present the mount fetch is skipped.
  initialData?: SnapshotsPayload | null
}

interface UseSnapshotsReturn {
  snapshots: SnapshotData[]
  // true only while nothing is on screen yet
  loading: boolean
  refreshing: boolean
  error: string | null
  refreshError: string | null
  lastUpdated: string | null
  refresh: () => Promise<void>
}

export function useSnapshots(options: UseSnapshotsOptions = {}): UseSnapshotsReturn {
  const { network, chain, autoRefresh = false, refreshInterval = 5 * 60 * 1000, initialData } = options

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (network) params.set('network', network)
    if (chain) params.set('chain', chain)
    return `/api/snapshots?${params}`
  }, [network, chain])

  const isServer = typeof window === 'undefined'
  const feed = useMemo(() => (isServer ? new SnapshotsFeed(url) : getSnapshotsFeed(url)), [isServer, url])

  // Seed before reading so the first client render already has the data.
  useMemo(() => {
    if (!isServer && initialData) feed.seed(initialData)
  }, [isServer, feed, initialData])

  // Used for the server render and hydration: depends only on the props,
  // so the client's first render matches the server HTML.
  const serverState = useMemo(() => (initialData ? stateFromPayload(initialData) : EMPTY_STATE), [initialData])
  const state = useSyncExternalStore(feed.subscribe, feed.getState, () => serverState)

  const [pollKey, setPollKey] = useState(0)

  useEffect(() => {
    void feed.ensureFresh(refreshInterval)
  }, [feed, refreshInterval])

  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return
    const stop = feed.startPolling(refreshInterval, isDocumentHidden)
    const onVisible = () => {
      if (!isDocumentHidden()) void feed.ensureFresh(refreshInterval)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [feed, autoRefresh, refreshInterval, pollKey])

  const refresh = useCallback(async () => {
    // A manual refresh restarts the interval.
    setPollKey(key => key + 1)
    await feed.load({ force: true })
  }, [feed])

  return {
    snapshots: state.snapshots,
    loading: state.loading || (!state.loaded && !state.error),
    refreshing: state.refreshing,
    error: state.error,
    refreshError: state.refreshError,
    lastUpdated: state.lastUpdated,
    refresh
  }
}
