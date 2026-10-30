import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const NOT_FOUND_TITLE = 'Page not found | SnapsVault'

type NotFoundPanelProps = {
  title: string
  description: React.ReactNode
  // Replaces the default "Back to the marketplace" link.
  action?: React.ReactNode
}

export function NotFoundPanel({ title, description, action }: NotFoundPanelProps) {
  return (
    <div className='w-full flex flex-col gap-4 p-8 bg-secondary-background rounded-md'>
      <h1 className='text-3xl font-semibold'>{title}</h1>
      <p className='text-sm text-muted-foreground'>{description}</p>
      <div>
        {action ?? (
          <Button asChild>
            <Link href='/'>Back to the marketplace</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
