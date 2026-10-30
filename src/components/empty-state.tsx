import React from 'react'

type EmptyStateProps = {
  title: string
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

// Empty and error state inside a section: no box of its own, at least one
// card row tall so the section keeps its size.
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className='min-h-[235px] flex flex-col items-center justify-center text-center'>
      {icon && <div className='h-12 w-12 mb-4 opacity-50 text-muted-foreground [&>svg]:size-full'>{icon}</div>}
      <h3 className='text-lg font-medium text-muted-foreground mb-2'>{title}</h3>
      {description && <p className='text-sm text-muted-foreground'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}
