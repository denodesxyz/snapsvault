import { NextResponse } from 'next/server'

// Any /api path without its own route answers in JSON, like every other API route.
function notFound() {
  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
}

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
export const HEAD = notFound
export const OPTIONS = notFound
