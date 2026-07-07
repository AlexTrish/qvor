import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { broker } from '@/lib/sse/broker'
import { z } from 'zod'

const schema = z.object({ fromUserId: z.string().uuid() })

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { fromUserId } = schema.parse(body)

  const now = new Date()

  // Mark all unread messages from this sender as read
  const { count } = await prisma.message.updateMany({
    where: {
      senderId: fromUserId,
      receiverId: user.id,
      deletedAt: null,
      readAt: null,
    },
    data: { readAt: now },
  })

  if (count > 0) {
    // Reset unreadCount
    await prisma.chatState.upsert({
      where: { userId_peerId: { userId: user.id, peerId: fromUserId } },
      create: { userId: user.id, peerId: fromUserId, peerType: 'user', unreadCount: 0 },
      update: { unreadCount: 0, lastReadAt: now },
    })

    // Notify sender via SSE
    broker.publish(fromUserId, {
      type: 'read',
      data: { byUserId: user.id, readAt: now.toISOString() },
    })
  }

  return NextResponse.json({ data: { count } })
}
