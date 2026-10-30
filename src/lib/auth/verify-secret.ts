import crypto from 'crypto'

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

export function isAuthorized(request: Request, envVarName: string): boolean {
  const secret = process.env[envVarName]
  if (!secret) {
    return false
  }

  const header = request.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) {
    return false
  }

  const token = header.slice('Bearer '.length)
  if (!token) {
    return false
  }

  return safeCompare(token, secret)
}
