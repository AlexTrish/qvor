import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { auth } from '@/middleware/auth'

const paramsSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: targetUserId } = await params

    const parsed = paramsSchema.safeParse({ id: targetUserId })

    // Нельзя заблокировать самого себя
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    // Проверяем, существует ли пользователь
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, telegramId: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, не заблокирован ли уже
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: targetUserId,
        },
      },
    })

    if (existingBlock) {
      return NextResponse.json({ error: 'User already blocked' }, { status: 409 })
    }

    // Создаём блокировку
    await prisma.block.create({
      data: {
        blockerId: user.id,
        blockedId: targetUserId,
      },
    })

    return NextResponse.json({ blocked: true })
  } catch (error) {
    logger.error('Block user error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: targetUserId } = await params

    const parsed = paramsSchema.safeParse({ id: targetUserId })

    // Удаляем блокировку
    const deleted = await prisma.block.deleteMany({
      where: {
        blockerId: user.id,
        blockedId: targetUserId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'User was not blocked' }, { status: 404 })
    }

    return NextResponse.json({ unblocked: true })
  } catch (error) {
    logger.error('Unblock user error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}