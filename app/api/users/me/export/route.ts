import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, messages, reactions, notifications, photos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, numericId: true, username: true, displayName: true,
        bio: true, isOnline: true, lastSeenAt: true, createdAt: true,
        telegramId: true, role: true,
      },
    }),
    prisma.message.findMany({
      where: { senderId: user.id, deletedAt: null },
      select: { id: true, receiverId: true, channelId: true, ciphertext: true, iv: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
    prisma.reaction.findMany({
      where: { userId: user.id },
      select: { messageId: true, emoji: true, createdAt: true },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      select: { type: true, title: true, read: true, createdAt: true },
      take: 200,
    }),
    prisma.photo.findMany({
      where: { userId: user.id },
      select: { id: true, caption: true, createdAt: true },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    messages: { count: messages.length, note: 'Сообщения хранятся в зашифрованном виде (E2E)', items: messages },
    reactions,
    notifications,
    photos: photos.map((p: { id: string; caption: string; createdAt: Date }) => ({ id: p.id, caption: p.caption, createdAt: p.createdAt })),
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="qvor-export-${user.id}.json"`,
    },
  })
}
