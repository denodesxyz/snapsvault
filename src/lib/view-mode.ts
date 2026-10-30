// Snapshot list view (cards or table). Stored in a cookie so the server
// renders the chosen view and its skeleton. Plain module: safe on server and client.
export type ViewMode = 'cards' | 'table'

export const VIEW_MODE_COOKIE = 'snapsvault-view-mode'

export const parseViewMode = (value: string | undefined | null): ViewMode =>
  value === 'table' ? 'table' : 'cards'
