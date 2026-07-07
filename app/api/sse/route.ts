import { type NextRequest } from 'next/server'
import { auth } from '@/middleware/auth'
import { broker } from '@/lib/sse/broker'
import type { SSEEventLegacy } from '@/lib/sse/broker'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function encode(event: SSEEventLegacy): string {
  const data = event.type === 'ping' ? '{}' : JSON.stringify((event as { data: unknown }).data)
  return `event: ${event.type}\ndata: ${data}\n\n`
}

// Кэш контактов — TTL 5 минут, чтобы не делать тяжёлый запрос при каждом подключении
const contactsCache = new Map<string, { ids: string[]; at: number }>()
const CONTACTS_TTL = 5 * 60_000

async function getContactIds(userId: string): Promise<string[]> {
  const cached = contactsCache.get(userId)
  if (cached && Date.now() - cached.at < CONTACTS_TTL) return cached.ids

  const rows = await prisma.message.findMany({
    where: {
      deletedAt: null,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
    distinct: ['senderId', 'receiverId'],
    take: 200,
  })

  const ids = new Set<string>()
  for (const r of rows) {
    if (r.senderId !== userId) ids.add(r.senderId)
    if (r.receiverId && r.receiverId !== userId) ids.add(r.receiverId)
  }

  const result = [...ids]
  contactsCache.set(userId, { ids: result, at: Date.now() })

  // Очистка старых записей (не чаще раза в минуту)
  if (contactsCache.size > 1000) {
    const cutoff = Date.now() - CONTACTS_TTL
    for (const [k, v] of contactsCache) {
      if (v.at < cutoff) contactsCache.delete(k)
    }
  }

  return result
}

export async function GET(req: NextRequest) {
  const user = await auth(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const now = new Date()

  // Один запрос — получаем hideOnline + unreadCount уведомлений
  const [userData, unreadNotifCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { hideOnline: true },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
  ])
  const hideOnline = userData?.hideOnline ?? false

  if (!hideOnline) {
    // Обновляем онлайн и уведомляем контакты параллельно
    Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeenAt: now },
      }),
      getContactIds(user.id).then(ids => {
        const online = ids.filter(id => broker.isConnected(id))
        if (online.length) {
          broker.publishMany(online, {
            type: 'pre',
            data: { u: user.id, on: true, ls: now.toISOString() },
          })
        }
      }),
    ]).catch(() => null)
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      let closed = false

      function send(event: SSEEventLegacy) {
        if (closed) return
        try {
          controller.enqueue(enc.encode(encode(event)))
        } catch {
          closed = true
        }
      }

      send({ type: 'ping' })

      // Отправляем счётчик непрочитанных уведомлений сразу при подключении
      if (unreadNotifCount > 0) {
        send({ type: 'notif', data: { unreadCount: unreadNotifCount } })
      }

      const unsub = broker.subscribe(user.id, send)

      const pingInterval = setInterval(() => {
        if (closed) { clearInterval(pingInterval); return }
        try {
          controller.enqueue(enc.encode(encode({ type: 'ping' })))
        } catch {
          closed = true
          clearInterval(pingInterval)
        }
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(pingInterval)
        unsub()

        if (!hideOnline) {
          const offlineAt = new Date()
          Promise.all([
            prisma.user.update({
              where: { id: user.id },
              data: { isOnline: false, lastSeenAt: offlineAt },
            }),
            getContactIds(user.id).then(ids => {
              const online = ids.filter(id => broker.isConnected(id))
              if (online.length) {
                broker.publishMany(online, {
                  type: 'pre',
                  data: { u: user.id, on: false, ls: offlineAt.toISOString() },
                })
              }
            }),
          ]).catch(() => null)
        }

        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
