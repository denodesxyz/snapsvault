import { NextRequest, NextResponse } from 'next/server'
import { readCappedBytes, validateHttpsUrl } from '@/lib/validation/feed'

const IDENTITY = /^[0-9A-Fa-f]{16}$/
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const FETCH_TIMEOUT_MS = 5000
const MAX_IMAGE_BYTES = 1_048_576

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identity: string }> }
) {
  const { identity } = await params

  if (!identity) {
    return NextResponse.json({ error: 'Identity required' }, { status: 400 })
  }

  if (!IDENTITY.test(identity)) {
    return NextResponse.redirect(new URL('/default-contributor.svg', request.url))
  }

  try {
    const keybaseResponse = await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${encodeURIComponent(identity)}&fields=pictures`,
      {
        headers: {
          'User-Agent': 'SnapsVault-App'
        },
        redirect: 'error',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      }
    )

    if (!keybaseResponse.ok) {
      throw new Error(`Keybase API error: ${keybaseResponse.status}`)
    }

    const data = await keybaseResponse.json()

    if (data.status?.code === 0 && data.them?.[0]?.pictures?.primary?.url) {
      const imageUrl = data.them[0].pictures.primary.url

      const pictureUrl = validateHttpsUrl(imageUrl)
      if (!pictureUrl.ok) {
        throw new Error(`Keybase picture URL rejected: ${pictureUrl.reason}`)
      }

      const imageResponse = await fetch(pictureUrl.value, { redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
      }

      const contentType = imageResponse.headers.get('content-type') || ''
      if (!IMAGE_TYPES.includes(contentType.split(';')[0].trim().toLowerCase())) {
        throw new Error(`Keybase picture has content-type ${contentType || 'none'}`)
      }

      const imageBuffer = await readCappedBytes(imageResponse, MAX_IMAGE_BYTES)

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return NextResponse.redirect(new URL('/default-contributor.svg', request.url))

  } catch (error) {
    console.error(`Error fetching Keybase avatar for ${identity}:`, error)

    return NextResponse.redirect(new URL('/default-contributor.svg', request.url))
  }
}
