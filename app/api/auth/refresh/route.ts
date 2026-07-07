import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export async function POST(_req: NextRequest) {
  try {
    const store = await cookies()
    const refreshToken = store.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ data: null, error: 'Не авторизован' }, { status: 401 })
    }

    const payload = await verifyToken(refreshToken)
    const accessToken = await signAccessToken({ userId: payload.userId, phone: payload.phone, role: payload.role })
    const newRefreshToken = await signRefreshToken({ userId: payload.userId, phone: payload.phone, role: payload.role })
    await setAuthCookies(accessToken, newRefreshToken)

    logger.info('Token refreshed', { userId: payload.userId })

    return NextResponse.json({ data: { refreshed: true }, error: null })
  } catch (err) {
    logger.error('refresh error', { err })
    return NextResponse.json({ data: null, error: 'Невалидный токен' }, { status: 401 })
  }
}
