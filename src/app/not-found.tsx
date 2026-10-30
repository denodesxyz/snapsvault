import type { Metadata } from 'next'
import { NOT_FOUND_TITLE, NotFoundPanel } from '@/components/not-found-panel'

export const metadata: Metadata = {
  title: NOT_FOUND_TITLE,
}

export default function NotFound() {
  return (
    <section className='w-full flex flex-col gap-4 py-8'>
      <NotFoundPanel title='Page not found' description='No page exists at this address' />
    </section>
  )
}
