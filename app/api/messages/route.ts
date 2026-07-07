import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { sendMessageSchema } from '@/lib/schemas/messages'
import { broker } from '@/lib/sse/broker'
import { getCachedMessages, setCachedMessages, upsertCachedMessage } from '@/lib/cache/messages'
import { sendPushToUser } from '@/lib/push'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const getMessagesSchema = z.object({
  with: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

const MSG_SELECT = {
  id: true,
  senderId: true,
  receiverId: true,
  ciphertext: true,
  iv: true,
  voiceUrl: true,
  voiceDuration: true,
  mediaUrl: true,
  mediaType: true,
  mediaName: true,
  mediaSize: true,
  replyToId: true,
  forwardFrom: true,
  createdAt: true,
  editedAt: true,
  readAt: true,
  sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
  receiver: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
  replyTo: {
    select: {
      id: true, ciphertext: true, iv: true, senderId: true,
      sender: { select: { id: true, displayName: true, username: true } },
    },
  },
  reactions: {
    select: { emoji: true, userId: true },
  },
} as const

async function fetchMessages(userId: string, peerId: string, limit: number, cursor?: string) {
  const isSelf = userId === peerId
  return prisma.message.findMany({
    where: {
      deletedAt: null,
      OR: isSelf
        ? [{ senderId: userId, receiverId: userId }]
        : [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
    },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    select: MSG_SELECT,
  })
}

type RawReaction = { emoji: string; userId: string }
type GroupedReaction = { emoji: string; count: number; mine: boolean; users: string[] }

function groupReactions(raw: RawReaction[], viewerId: string): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>()
  for (const r of raw) {
    const existing = map.get(r.emoji)
    if (existing) {
      existing.count++
      existing.users.push(r.userId)
      if (r.userId === viewerId) existing.mine = true
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, mine: r.userId === viewerId, users: [r.userId] })
    }
  }
  return [...map.values()]
}

type FetchedMessage = Awaited<ReturnType<typeof fetchMessages>>[number]

function toOrdered(msgs: FetchedMessage[], viewerId: string) {
  return msgs.reverse().map(m => ({
    ...m,
    reactions: groupReactions(m.reactions, viewerId),
  }))
}

async function fetchAndCache(userId: string, peerId: string, limit: number) {
  const msgs = await fetchMessages(userId, peerId, limit)
  setCachedMessages(userId, peerId, toOrdered(msgs, userId))
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const query = getMessagesSchema.parse({
      with:   searchParams.get('with')   ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit:  searchParams.get('limit')  ?? undefined,
    })

    const peerId = query.with ?? user.id

    // Закреплённое сообщение для этого диалога
    let pinnedMessage: Record<string, unknown> | null = null
    try {
      const pinned = await prisma.$queryRaw<{ message_id: string }[]>`
        SELECT message_id FROM pinned_messages WHERE user_id = ${user.id} AND peer_id = ${peerId} LIMIT 1
      `
      if (pinned[0]?.message_id) {
        const msg = await prisma.message.findUnique({
          where: { id: pinned[0].message_id, deletedAt: null },
          select: MSG_SELECT,
        })
        if (msg) pinnedMessage = { ...msg, createdAt: (msg.createdAt as Date).toISOString(), reactions: [] }
      }
    } catch { /* table may not exist yet */ }

    if (!query.cursor) {
      const cached = getCachedMessages(user.id, peerId)
      if (cached) {
        fetchAndCache(user.id, peerId, query.limit).catch(() => null)
        return NextResponse.json({ messages: cached, nextCursor: null, pinnedMessage })
      }
    }

    const messages = await fetchMessages(user.id, peerId, query.limit, query.cursor)
    const nextCursor = messages.length === query.limit ? messages[messages.length - 1].id : null
    const ordered = toOrdered(messages, user.id)

    if (!query.cursor) setCachedMessages(user.id, peerId, ordered)

    // ETag — браузер не будет перезагружать если данные не изменились
    const lastId = ordered[0]?.id ?? 'empty'
    const etag = `"${peerId}-${lastId}"`
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304 })
    }

    return NextResponse.json({ messages: ordered, nextCursor, pinnedMessage }, {
      headers: { 'ETag': etag, 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные параметры', details: error.issues }, { status: 400 })
    }
    console.error('[GET /api/messages]', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'messages')
    if (limited) return limited

    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { receiverId, ciphertext, iv, replyToId, forwardFrom, mentions, mediaUrl, mediaType, mediaName, mediaSize } = sendMessageSchema.parse(body)

    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } })
    if (!receiver) return NextResponse.json({ error: 'Получатель не найден' }, { status: 404 })

    const isBlocked = await prisma.block.findFirst({
      where: { blockerId: receiverId, blockedId: user.id },
    })
    if (isBlocked) return NextResponse.json({ error: 'Вы заблокированы этим пользователем' }, { status: 403 })

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        ciphertext,
        iv,
        ...(replyToId ? { replyToId } : {}),
        ...(forwardFrom ? { forwardFrom } : {}),
        ...(mediaUrl ? { mediaUrl, mediaType, mediaName, mediaSize } : {}),
      },
      select: {
        id: true, senderId: true, receiverId: true,
        ciphertext: true, iv: true, replyToId: true, forwardFrom: true,
        createdAt: true, editedAt: true,
        sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
        receiver: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: {
          select: {
            id: true, ciphertext: true, iv: true, senderId: true,
            sender: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
    })

    // Check if this is the first message between these users (new conversation)
    const isFirstMessage = await prisma.message.count({
      where: {
        deletedAt: null,
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    }) === 1

    const msgData = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
    }

    // Increment unreadCount for receiver
    if (receiverId !== user.id) {
      await prisma.chatState.upsert({
        where: { userId_peerId: { userId: receiverId, peerId: user.id } },
        create: { userId: receiverId, peerId: user.id, peerType: 'user', unreadCount: 1 },
        update: { unreadCount: { increment: 1 } },
      })
    }

    broker.publish(receiverId, { type: 'msg', data: msgData as Record<string, unknown> })

    // Push notification if receiver is offline
    if (!broker.isConnected(receiverId)) {
      const senderName = message.sender.displayName || message.sender.username || `User ${message.sender.numericId}`
      sendPushToUser(receiverId, {
        title: senderName,
        body: '🔒 Зашифрованное сообщение',
        url: `/messages?id=${user.id}`,
        tag: `msg-${user.id}`,
      }).catch(() => null)
    }

    // Mention notifications
    if (mentions?.length) {
      const senderName = message.sender.displayName || message.sender.username || `User ${message.sender.numericId}`
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentions } },
        select: { id: true },
      })
      await Promise.all(mentionedUsers
        .filter((u: { id: string }) => u.id !== user.id && u.id !== receiverId)
        .map((u: { id: string }) => prisma.notification.create({
          data: {
            userId: u.id,
            type: 'mention',
            title: `${senderName} упомянул вас`,
            body: '🔒 Зашифрованное сообщение',
            data: { messageId: message.id, fromUserId: user.id },
          },
        }))
      )
    }

    // If first message — notify receiver about new conversation
    if (isFirstMessage) {
      broker.publish(receiverId, {
        type: 'conv_new',
        data: {
          user: message.sender,
          lastMessageAt: message.createdAt.toISOString(),
          archived: false, pinned: false, pinnedAt: null, unreadCount: 1,
        },
      })
    }

    // Update cache
    upsertCachedMessage(user.id, receiverId, {
      ...msgData,
      sender: message.sender,
      receiver: message.receiver,
    })

    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Некорректные данные', details: error.issues }, { status: 400 })
    }
    console.error('[POST /api/messages]', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
