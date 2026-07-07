import 'server-only'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type PushPayload = {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

// Minimal VAPID JWT signing without external deps
async function signVapid(audience: string): Promise<string> {
  const privateKeyB64 = process.env.VAPID_PRIVATE_KEY!
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@qvor.ru'

  const header = { alg: 'ES256', typ: 'JWT' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  }

  const enc = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsigned = `${enc(header)}.${enc(payload)}`

  const keyBytes = Uint8Array.from(atob(privateKeyB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${unsigned}.${sigB64}`
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) return

  const body = JSON.stringify(payload)
  const stale: string[] = []

  await Promise.allSettled(subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      const url = new URL(sub.endpoint)
      const audience = `${url.protocol}//${url.host}`
      const jwt = await signVapid(audience)

      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `vapid t=${jwt},k=${process.env.VAPID_PUBLIC_KEY}`,
          'TTL': '86400',
        },
        body,
      })

      if (res.status === 410 || res.status === 404) stale.push(sub.endpoint)
    } catch (err) {
      logger.warn('Push send failed', { endpoint: sub.endpoint.slice(0, 40), err: String(err) })
    }
  }))

  // Clean up expired subscriptions
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } })
  }
}
