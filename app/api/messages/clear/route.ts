import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  peerId: z.string().uuid(),
  mode: z.enum(['clear', 'delete']),
})

// POST /api/messages/clear
// mode=clear  — очистить у себя (сохраняем timestamp, фильтруем на клиенте)
// mode=delete — удалить у обоих (soft delete всех сообщений диалога)
export async function POST(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { peerId, mode } = schema.parse(body)

    if (mode === 'delete') {
      await prisma.message.updateMany({
        where: {
          deletedAt: null,
          OR: [
            { senderId: user.id, receiverId: peerId },
            { senderId: peerId, receiverId: user.id },
          ],
        },
        data: { deletedAt: new Date() },
      })
    } else {
      // Сохраняем время очистки в ChatState.lastReadAt — сообщения до этого времени скрываем
      await prisma.chatState.upsert({
        where: { userId_peerId: { userId: user.id, peerId } },
        create: { userId: user.id, peerId, peerType: 'user', lastReadAt: new Date() },
        update: { lastReadAt: new Date() },
      })
    }

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
