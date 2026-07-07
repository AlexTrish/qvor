import { type NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/cookies'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const user = await auth(req)
    if (user) {
      // Отмечаем пользователя офлайн
      prisma.user.update({
        where: { id: user.id },
        data: { isOnline: false, lastSeenAt: new Date() },
      }).catch(() => null)
    }
    await clearAuthCookies()
    logger.info('User logged out', { userId: user?.id })
    return NextResponse.json({ data: { loggedOut: true }, error: null })
  } catch (err) {
    logger.error('logout error', { err })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
