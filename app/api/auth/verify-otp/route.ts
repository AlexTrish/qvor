import { type NextRequest, NextResponse } from 'next/server'
import { verifyOtpSchema } from '@/lib/schemas/auth'
import { verifyOtp, sendLoginNotification } from '@/lib/auth/otp'
import { verifyPhone } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { isMockEnabled, findMockUserByPhone, MOCK_OTP } from '@/lib/dev/mock-users'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { apiLogger as logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone: rawPhone, otpCode } = parsed.data
    const phone = rawPhone.replace(/^\+/, '')

    // Мок
    if (isMockEnabled()) {
      const mockUser = findMockUserByPhone(phone)
      if (mockUser) {
        if (otpCode !== MOCK_OTP) {
          return NextResponse.json({ data: null, error: 'Неверный или истёкший код' }, { status: 400 })
        }
        const accessToken = await signAccessToken({
          userId: mockUser.id, phone,
          role: mockUser.role,
          username: mockUser.username,
        })
        const refreshToken = await signRefreshToken({ userId: mockUser.id, phone, role: mockUser.role })
        await setAuthCookies(accessToken, refreshToken)
        return NextResponse.json({ data: { userId: mockUser.id, blob: mockUser.blob }, error: null })
      }
    }

    const otpValid = await verifyOtp(`otp:${phone}`, otpCode)
    if (!otpValid) {
      return NextResponse.json({ data: null, error: 'Неверный или истёкший код' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      select: { id: true, phoneHash: true, blob: true, username: true, role: true, createdAt: true },
    })
    const user = await (async () => {
      for (const u of users) {
        if (await verifyPhone(phone, u.phoneHash)) return u
      }
      return null
    })()

    if (!user) {
      return NextResponse.json({ data: null, error: 'Пользователь не найден' }, { status: 404 })
    }

    const accessToken = await signAccessToken({
      userId: user.id,
      phone,
      role: user.role as 'USER' | 'SUPER_ADMIN',
      username: user.username ?? undefined,
      createdAt: user.createdAt.toISOString(),
    })
    const refreshToken = await signRefreshToken({
      userId: user.id,
      phone,
      role: user.role as 'USER' | 'SUPER_ADMIN',
    })
    await setAuthCookies(accessToken, refreshToken)

    // Отправляем уведомление о входе в QVOR бот
    const ua = req.headers.get('user-agent') ?? 'Неизвестное устройство'
    const device = ua.length > 80 ? ua.slice(0, 80) + '...' : ua
    sendLoginNotification(phone, device).catch(() => null)

    // Сохраняем сессию
    const { createHash } = await import('crypto')
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? null
    prisma.$executeRaw`
      INSERT INTO user_sessions (user_id, refresh_token_hash, device, ip)
      VALUES (${user.id}::uuid, ${tokenHash}, ${device}, ${ip})
      ON CONFLICT (refresh_token_hash) DO UPDATE SET last_active_at = NOW()
    `.catch(() => null)

    logger.info('User logged in', { userId: user.id, role: user.role })
    return NextResponse.json({ data: { userId: user.id, blob: user.blob }, error: null })
  } catch (err) {
    logger.error('verify-otp error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
