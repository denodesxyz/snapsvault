import type { OverallState } from '@/lib/status-system'
import { cn } from '@/lib/utils'

const BANNER: Record<OverallState, { text: string; dot: string }> = {
  operational: { text: 'All systems operational', dot: 'bg-success' },
  degraded: { text: 'Some systems are degraded', dot: 'bg-warning' },
  outage: { text: 'Service outage', dot: 'bg-destructive' },
  unknown: { text: 'Monitoring history starts with the first check', dot: 'bg-muted-foreground' },
}

export function StatusBanner({ state }: { state: OverallState }) {
  const { text, dot } = BANNER[state]
  return (
    <div role='status' className='w-full rounded-md border p-4 xs:p-6 flex items-center gap-3'>
      <span aria-hidden='true' className={cn('size-3 shrink-0 rounded-full', dot)} />
      <p className={cn('text-lg font-semibold', state === 'unknown' && 'text-muted-foreground')}>{text}</p>
    </div>
  )
}
