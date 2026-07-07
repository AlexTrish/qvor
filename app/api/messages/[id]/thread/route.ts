import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Проверяем что пользователь имеет доступ к родительскому сообщению
  const parent = await prisma.message.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true, senderId: true, receiverId: true, channelId: true,
      ciphertext: true, iv: true, createdAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Проверка доступа: участник диалога или канала
  const hasAccess =
    parent.senderId === user.id ||
    parent.receiverId === user.id ||
    (parent.channelId && await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: parent.channelId, userId: user.id } },
    }))

  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const replies = await prisma.message.findMany({
    where: { replyToId: id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, senderId: true, receiverId: true, channelId: true,
      ciphertext: true, iv: true, replyToId: true, createdAt: true, editedAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  })

  return NextResponse.json({ data: { parent, replies, count: replies.length } })
}
