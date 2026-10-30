"use client"

import { useParams } from 'next/navigation'
import { NotFoundPanel } from '@/components/not-found-panel'
import { SnapshotNotFound } from '@/components/snapshot-not-found'
import { parseSnapshotRouteParams } from '@/lib/snapshot-route'

// Catches notFound() from [contributor]/layout.tsx, whose generateMetadata sets the title.
export default function SnapshotRouteNotFound() {
  const snapshot = parseSnapshotRouteParams(useParams())

  if (snapshot) return <SnapshotNotFound {...snapshot} />

  return (
    <section className='w-full flex flex-col gap-4 py-8'>
      <NotFoundPanel title='Page not found' description='No page exists at this address' />
    </section>
  )
}
