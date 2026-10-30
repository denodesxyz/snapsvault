import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/public-names'
import { getSnapshotsPayload } from '@/lib/snapshots-payload'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/` },
    { url: `${SITE_ORIGIN}/status` },
  ]
  try {
    const { data } = await getSnapshotsPayload({ network: 'celestia', chain: null })
    for (const snapshot of data) {
      pages.push({
        url: `${SITE_ORIGIN}/${snapshot.network.name.toLowerCase()}/${snapshot.chain_id}/${snapshot.block_height}/${encodeURIComponent(snapshot.contributor.name)}`,
        lastModified: snapshot.time,
      })
    }
  } catch (error) {
    console.error('Sitemap: snapshot read failed, listing the fixed pages only:', error instanceof Error ? error.name : 'UnknownError')
  }
  return pages
}
