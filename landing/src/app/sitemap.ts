import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://snapsvault.xyz', lastModified: new Date('2026-10-14'), changeFrequency: 'weekly', priority: 1 }]
}
