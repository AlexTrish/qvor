import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stripHtml } from '@/lib/utils'

export const CHANNEL_CATEGORIES = ['news', 'blogs', 'memes', 'other'] as const
export type ChannelCategory = typeof CHANNEL_CATEGORIES[number]

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  type: z.enum(['CHANNEL', 'GROUP']).default('CHANNEL'),
  category: z.enum(CHANNEL_CATEGORIES).default('other'),
  encryptedChannelKey: z.string().optional(), // channelKey зашифрованный publicKey создателя
})

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const pub = searchParams.get('public') === '1'

  // Публичные каналы — без авторизации по членству
  if (pub) {
    const channels = await prisma.channel.findMany({
      where: { isPrivate: false, type: 'CHANNEL' },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({
      data: channels.map((c: typeof channels[number]) => ({
        id: c.id, name: c.name, description: c.description,
        avatarUrl: c.avatarUrl, isPrivate: c.isPrivate, type: c.type,
        category: c.category, memberCount: c._count.members,
        role: null, pinned: false, lastMessageAt: c.createdAt.toISOString(),
      })),
      error: null,
    })
  }

  const members = await prisma.channelMember.findMany({
    where: { userId: user.id },
    include: {
      channel: {
        include: {
          _count: { select: { members: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              createdAt: true, ciphertext: true, iv: true,
              sender: { select: { displayName: true, username: true, numericId: true } },
            },
          },
        },
      },
    },
    orderBy: [{ pinned: 'desc' }, { joinedAt: 'desc' }],
  })

  const data = members.map((m: typeof members[number]) => {
    const lastMsg = m.channel.messages[0]
    const isPlain = lastMsg?.iv && (lastMsg.iv.startsWith('plain-') || lastMsg.iv.startsWith('iv-') || lastMsg.iv.startsWith('mock'))
    const lastMessage = lastMsg ? (isPlain ? lastMsg.ciphertext : null) : null
    const s = lastMsg?.sender
    const lastMessageSenderName = s ? (s.displayName || s.username || `User ${s.numericId}`) : null
    return {
      id: m.channel.id,
      name: m.channel.name,
      description: m.channel.description,
      avatarUrl: m.channel.avatarUrl,
      isPrivate: m.channel.isPrivate,
      type: m.channel.type,
      category: m.channel.category,
      role: m.role,
      pinned: m.pinned,
      pinnedAt: m.pinnedAt?.toISOString() ?? null,
      memberCount: m.channel._count.members,
      lastMessageAt: lastMsg?.createdAt.toISOString() ?? m.joinedAt.toISOString(),
      lastMessage,
      lastMessageSenderName,
      unreadCount: m.unreadCount,
    }
  })

  return NextResponse.json({ data, error: null })
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const { name, description, isPrivate, type, category, encryptedChannelKey } = parsed.data

  const channel = await prisma.channel.create({
    data: {
      name: stripHtml(name), description: description ? stripHtml(description) : description,
      isPrivate, type, category,
      members: { create: { userId: user.id, role: 'OWNER', channelKey: encryptedChannelKey ?? '' } },
    },
  })

  return NextResponse.json({ data: { ...channel, role: 'OWNER', pinned: false, memberCount: 1 }, error: null }, { status: 201 })
}
