import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { SYSTEM_BOT_ID } from '@/lib/system-bot'
import type { ChatState } from '@prisma/client'

function safeLastMessage(ciphertext: string | null, iv?: string | null, voiceUrl?: string | null): string | null {
  if (!ciphertext && !voiceUrl) return null
  if (voiceUrl || iv === 'voice') return '🎤 Голосовое'
  if (iv && (iv.startsWith('plain-') || iv.startsWith('iv-') || iv.startsWith('mock'))) return ciphertext
  return ciphertext
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === '1'

    // Один SQL запрос вместо двух findMany без лимита.
    // DISTINCT ON (peer_id) — берём только последнее сообщение на каждого собеседника.
    type RawConv = {
      peer_id: string
      last_msg_at: Date
      ciphertext: string
      iv: string
      sender_id: string
      read_at: Date | null
      voice_url: string | null
      peer_numeric_id: number
      peer_username: string | null
      peer_display_name: string | null
      peer_avatar_url: string | null
      peer_is_online: boolean
      peer_last_seen_at: Date | null
      sender_display_name: string | null
      sender_username: string | null
      sender_numeric_id: number
    }

    const [rows, chatStates, selfUser, lastSelfMsg, lastBotMsg] = await Promise.all([
      prisma.$queryRaw<RawConv[]>`
        SELECT DISTINCT ON (peer_id)
          peer_id,
          m.created_at   AS last_msg_at,
          m.ciphertext,
          m.iv,
          m.voice_url,
          m.sender_id,
          m.read_at,
          u.numeric_id   AS peer_numeric_id,
          u.username     AS peer_username,
          u.display_name AS peer_display_name,
          u.avatar_url   AS peer_avatar_url,
          u.is_online    AS peer_is_online,
          u.last_seen_at AS peer_last_seen_at,
          s.display_name AS sender_display_name,
          s.username     AS sender_username,
          s.numeric_id   AS sender_numeric_id
        FROM (
          SELECT
            CASE WHEN sender_id = ${user.id} THEN receiver_id ELSE sender_id END AS peer_id,
            id, created_at, ciphertext, iv, voice_url, sender_id, receiver_id, read_at
          FROM messages
          WHERE deleted_at IS NULL
            AND (sender_id = ${user.id} OR receiver_id = ${user.id})
            AND receiver_id != sender_id
            AND (
              sender_id != ${SYSTEM_BOT_ID}
              OR receiver_id = ${user.id}
            )
        ) m
        JOIN users u ON u.id = m.peer_id
        JOIN users s ON s.id = m.sender_id
        ORDER BY peer_id, m.created_at DESC
      `,
      prisma.chatState.findMany({ where: { userId: user.id } }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeenAt: true },
      }),
      prisma.message.findFirst({
        where: { senderId: user.id, receiverId: user.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      // Последнее сообщение от бота
      prisma.message.findFirst({
        where: { senderId: SYSTEM_BOT_ID, receiverId: user.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, ciphertext: true, iv: true, voiceUrl: true },
      }),
    ])

    const stateMap = new Map<string, ChatState>(chatStates.map((s: ChatState) => [s.peerId, s]))

    const conversations = rows
      .map((r: RawConv) => {
        const state = stateMap.get(r.peer_id)
        const isOwn = r.sender_id === user.id
        return {
          user: {
            id: r.peer_id,
            numericId: r.peer_numeric_id,
            username: r.peer_username,
            displayName: r.peer_display_name,
            avatarUrl: r.peer_avatar_url,
            isOnline: r.peer_is_online,
            lastSeenAt: r.peer_last_seen_at?.toISOString() ?? null,
          },
          lastMessageAt: r.last_msg_at.toISOString(),
          lastMessage: safeLastMessage(r.ciphertext, r.iv, r.voice_url ?? null),
          lastMessageSenderId: r.sender_id,
          lastMessageSenderName: isOwn
            ? 'You'
            : (r.sender_display_name || r.sender_username || `User ${r.sender_numeric_id}`),
          lastMessageReadAt: r.read_at?.toISOString() ?? null,
          archived: state?.archived ?? false,
          pinned: state?.pinned ?? false,
          pinnedAt: state?.pinnedAt?.toISOString() ?? null,
          unreadCount: state?.unreadCount ?? 0,
        }
      })
      .filter((c: { archived: boolean }) => c.archived === archived)
      .sort((a: { pinned: boolean; pinnedAt: string | null; lastMessageAt: string }, b: { pinned: boolean; pinnedAt: string | null; lastMessageAt: string }) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (a.pinned && b.pinned) return new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime()
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })

    const selfState = stateMap.get(user.id)
    const favorites = {
      user: selfUser,
      lastMessageAt: (lastSelfMsg?.createdAt ?? new Date(0)).toISOString(),
      lastMessage: null,
      lastMessageSenderId: null,
      lastMessageSenderName: null,
      lastMessageReadAt: null,
      archived: false,
      pinned: selfState?.pinned ?? false,
      pinnedAt: selfState?.pinnedAt?.toISOString() ?? null,
      unreadCount: 0,
    }

    // Чат с ботом QVOR — всегда показываем, даже если сообщений нет
    const botState = stateMap.get(SYSTEM_BOT_ID)
    const botConv = {
      user: {
        id: SYSTEM_BOT_ID,
        numericId: 100000,
        username: 'qvor',
        displayName: 'QVOR',
        avatarUrl: null,
        isOnline: true,
        lastSeenAt: null,
      },
      lastMessageAt: (lastBotMsg?.createdAt ?? new Date(0)).toISOString(),
      lastMessage: lastBotMsg ? safeLastMessage(lastBotMsg.ciphertext, lastBotMsg.iv) : null,
      lastMessageSenderId: SYSTEM_BOT_ID,
      lastMessageSenderName: 'QVOR',
      lastMessageReadAt: null,
      archived: false,
      pinned: botState?.pinned ?? false,
      pinnedAt: botState?.pinnedAt?.toISOString() ?? null,
      unreadCount: botState?.unreadCount ?? 0,
    }

    const result = archived ? conversations : [favorites, botConv, ...conversations]
    return NextResponse.json({ data: result, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
