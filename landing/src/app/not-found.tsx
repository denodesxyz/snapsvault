import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Page not found | SnapsVault',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div className='w-full flex flex-col pt-[32px] pb-[90px] base:pb-[132px]'>
      <div className='w-full p-6 xs:p-8 rounded-md bg-secondary-background flex flex-col items-start gap-4'>
        <h1 className='text-[28px] leading-9 xs:text-[36px] xs:leading-[44px] base:text-[40px] base:leading-[48px] font-bold'>Page not found</h1>
        <p className='text-base leading-6 text-muted-foreground'>The address does not match anything on this site</p>
        <Button asChild className='text-on-brand hover:text-on-brand'>
          <Link href='/'>Back to the start</Link>
        </Button>
      </div>
    </div>
  )
}
