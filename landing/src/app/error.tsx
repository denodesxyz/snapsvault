'use client'

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className='w-full flex flex-col items-center justify-center gap-4 rounded-md bg-secondary-background p-8 text-center'>
      <h2 className='text-lg font-semibold'>Something went wrong</h2>
      <button type='button' onClick={() => reset()} className='text-sm text-muted-foreground underline-offset-4 hover:underline'>
        Try again
      </button>
    </div>
  )
}
