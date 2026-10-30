import React from 'react'
import { cn } from '@/lib/utils'

type SectionHeaderProps = {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  // Keep the actions on the title row at every width (small controls such
  // as carousel arrows). Toolbars stack below the title block under md.
  inlineActions?: boolean
  // Under md the actions sit at the right end of the title row and the
  // subtitle takes the full width below. From md up it is the usual layout.
  actionsOnTitleRow?: boolean
  // Title and subtitle centred under md, left-aligned from md up.
  centerBelowMd?: boolean
}

// The one header for every app section: title and subtitle in their own
// block 4px apart, actions in a sibling so they never sit between the two.
export function SectionHeader({ title, subtitle, actions, inlineActions = false, actionsOnTitleRow = false, centerBelowMd = false }: SectionHeaderProps) {
  return (
    <div className={cn(
      'justify-between',
      actionsOnTitleRow
        ? 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 md:flex md:gap-4 md:items-start'
        : cn('flex gap-4', inlineActions ? 'flex-row items-start' : 'flex-col md:flex-row md:items-start')
    )}>
      <div className={cn('flex flex-col gap-1 min-w-0', actionsOnTitleRow && 'contents md:flex', centerBelowMd && 'text-center md:text-left')}>
        <h2 className={cn('text-xl font-semibold', actionsOnTitleRow && 'col-start-1 row-start-1')}>{title}</h2>
        {subtitle && <p className={cn('text-sm text-muted-foreground', actionsOnTitleRow && 'col-span-2 row-start-2')}>{subtitle}</p>}
      </div>
      {actions && <div className={cn('flex items-start gap-2 shrink-0', actionsOnTitleRow && 'col-start-2 row-start-1 self-center md:self-auto')}>{actions}</div>}
    </div>
  )
}
