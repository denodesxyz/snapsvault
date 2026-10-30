// Optional status data (history, uptime, sync runs) must never take the core feed rows down
// with it: a rejected or timed out read becomes its fallback and a failed flag.
export async function settle<T>(promise: PromiseLike<T>, fallback: T): Promise<{ value: T; failed: boolean }> {
  try {
    return { value: await promise, failed: false }
  } catch (error) {
    console.error('Status page: optional read failed:', error instanceof Error ? error.name : 'UnknownError')
    return { value: fallback, failed: true }
  }
}
