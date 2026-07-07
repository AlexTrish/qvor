import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { clearAuthCookies } from '@/lib/auth/cookies'
import { logger } from '@/lib/logger'

export async function DELETE(req: NextRequest) {
  try {
    const user = await auth(req)
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

    // Удаляем все данные пользователя каскадно
    await prisma.$transaction([
      prisma.block.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } }),
      prisma.message.deleteMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } }),
      prisma.channelMember.deleteMany({ where: { userId: user.id } }),
      prisma.tempStore.deleteMany({ where: { key: { startsWith: `otp:` } } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])

    await clearAuthCookies()
    logger.info('Account deleted', { userId: user.id })
    return NextResponse.json({ data: { deleted: true }, error: null })
  } catch (err) {
    logger.error('delete account error', { err })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
