import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { editMessageSchema } from '@/lib/schemas/messages'
import { broker } from '@/lib/sse/broker'
import { upsertCachedMessage, removeCachedMessage } from '@/lib/cache/messages'
import { z } from 'zod'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: messageId } = await params
    const body = await request.json()
    const { ciphertext, iv } = editMessageSchema.parse(body)

    // Находим сообщение и проверяем, что оно принадлежит пользователю
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        deletedAt: true,
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })
    }

    if (message.senderId !== user.id) {
      return NextResponse.json({ error: 'Нет прав на редактирование' }, { status: 403 })
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: 'Нельзя редактировать удаленное сообщение' }, { status: 400 })
    }

    // Обновляем сообщение
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        ciphertext,
        iv,
        editedAt: new Date(),
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        ciphertext: true,
        iv: true,
        createdAt: true,
        editedAt: true,
      },
    })

    // Push SSE edit event to receiver
    if (updatedMessage.receiverId) {
      broker.publish(updatedMessage.receiverId, {
        type: 'medit',
        data: {
          id: updatedMessage.id,
          ct: updatedMessage.ciphertext,
          iv: updatedMessage.iv,
          ea: updatedMessage.editedAt!.toISOString(),
        },
      })
      // Update cache
      const cached = { id: updatedMessage.id, senderId: user.id, receiverId: updatedMessage.receiverId,
        ciphertext: updatedMessage.ciphertext, iv: updatedMessage.iv,
        createdAt: updatedMessage.createdAt.toISOString(),
        editedAt: updatedMessage.editedAt?.toISOString() ?? null,
        sender: { id: user.id, numericId: 0 }, receiver: { id: updatedMessage.receiverId, numericId: 0 },
      }
      upsertCachedMessage(user.id, updatedMessage.receiverId, cached as Parameters<typeof upsertCachedMessage>[2])
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Edit message error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: messageId } = await params
    const body = await request.json().catch(() => ({}))
    const mode: 'self' | 'all' = body.mode === 'all' ? 'all' : 'self'

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, receiverId: true, deletedAt: true },
    })

    if (!message) return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })

    const isParticipant = message.senderId === user.id || message.receiverId === user.id
    if (!isParticipant) return NextResponse.json({ error: 'Нет прав' }, { status: 403 })

    if (mode === 'all') {
      // Удалить у обоих — только отправитель может
      if (message.senderId !== user.id) {
        return NextResponse.json({ error: 'Удалить у обоих может только отправитель' }, { status: 403 })
      }

      // Hard delete — удаляем из БД полностью
      await prisma.message.delete({ where: { id: messageId } })

      const peerId = message.receiverId!
      broker.publish(peerId, { type: 'mdel', data: { id: messageId } })
      broker.publish(user.id, { type: 'mdel', data: { id: messageId } })
      removeCachedMessage(user.id, peerId, messageId)
    } else {
      // Удалить только у себя — запись в hidden_messages
      await prisma.$executeRaw`
        INSERT INTO hidden_messages(user_id, message_id)
        VALUES (${user.id}, ${messageId})
        ON CONFLICT DO NOTHING
      `
      // SSE только себе
      broker.publish(user.id, { type: 'mdel', data: { id: messageId } })
    }

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}