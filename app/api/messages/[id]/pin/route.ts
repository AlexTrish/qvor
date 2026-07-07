import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { broker } from '@/lib/sse/broker'
import { z } from 'zod'

const schema = z.object({
  mode: z.enum(['self', 'all']),  // self = только у себя, all = у обоих
})

// POST /api/messages/[id]/pin — закрепить
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: messageId } = await params
    const body = await request.json().catch(() => ({}))
    const { mode } = schema.parse(body)

    const message = await prisma.message.findUnique({
      where: { id: messageId, deletedAt: null },
      select: { id: true, senderId: true, receiverId: true },
    })
    if (!message) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

    const peerId = message.senderId === user.id ? message.receiverId! : message.senderId

    // Сохраняем закреп у себя
    await prisma.$executeRaw`
      INSERT INTO pinned_messages(user_id, peer_id, message_id)
      VALUES (${user.id}, ${peerId}, ${messageId})
      ON CONFLICT(user_id, peer_id) DO UPDATE SET message_id = ${messageId}, pinned_at = now()
    `

    const pinData = { messageId, pinnedBy: user.id }

    if (mode === 'all') {
      // Закрепляем у собеседника тоже
      await prisma.$executeRaw`
        INSERT INTO pinned_messages(user_id, peer_id, message_id)
        VALUES (${peerId}, ${user.id}, ${messageId})
        ON CONFLICT(user_id, peer_id) DO UPDATE SET message_id = ${messageId}, pinned_at = now()
      `
      broker.publish(peerId, { type: 'msg_pin' as any, data: pinData })
    }

    broker.publish(user.id, { type: 'msg_pin' as any, data: pinData })

    return NextResponse.json({ data: { ok: true, messageId }, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/messages/[id]/pin — открепить
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: messageId } = await params

    await prisma.$executeRaw`
      DELETE FROM pinned_messages WHERE user_id = ${user.id} AND message_id = ${messageId}
    `

    broker.publish(user.id, { type: 'msg_unpin' as any, data: { messageId } })

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
