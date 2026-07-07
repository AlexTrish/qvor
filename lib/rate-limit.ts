import 'server-only'
import { type NextRequest, NextResponse } from 'next/server'

const requests = new Map<string, { count: number; resetAt: number }>()

const LIMITS: Record<string, { window: number; max: number }> = {
  auth:     { window: 60_000, max: 10  },
  messages: { window: 60_000, max: 120 },
  api:      { window: 60_000, max: 300 },
}

export async function rateLimit(
  req: NextRequest,
  type: keyof typeof LIMITS = 'api',
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'anonymous'
  const key = `${type}:${ip}`
  const now = Date.now()
  const { window, max } = LIMITS[type]

  const entry = requests.get(key)
  if (!entry || entry.resetAt < now) {
    requests.set(key, { count: 1, resetAt: now + window })
    return null
  }

  entry.count++
  if (entry.count > max) {
    return NextResponse.json(
      { data: null, error: 'Слишком много запросов. Попробуйте позже.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      },
    )
  }
  return null
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of requests) if (v.resetAt < now) requests.delete(k)
  }, 5 * 60_000)
}
