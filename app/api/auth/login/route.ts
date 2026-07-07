import { type NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/schemas/auth'
import { verifyPassword, verifyPhone } from '@/lib/auth/password'
import { generateOtp, saveOtp, sendOtp } from '@/lib/auth/otp'
import { isMockEnabled, findMockUserByPhone, MOCK_OTP } from '@/lib/dev/mock-users'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { apiLogger as logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone: rawPhone, password } = parsed.data
    const phone = rawPhone.replace(/^\+/, '')

    console.log('Login data:', { phone, isMockEnabled: isMockEnabled() })

    // Мок для разработки
    if (isMockEnabled()) {
      console.log('Mock enabled, looking for user with phone:', phone)
      const mockUser = findMockUserByPhone(phone)
      console.log('Found mock user:', mockUser)
      if (mockUser) {
        if (password !== mockUser.password) {
          console.log('Mock password mismatch')
          return NextResponse.json({ data: null, error: 'Неверный номер или пароль' }, { status: 401 })
        }
        logger.debug('Mock login success', { phone, code: MOCK_OTP })
        return NextResponse.json({ data: { otpSent: true, channel: 'mock' }, error: null })
      }
      console.log('Mock user not found')
    }

    const users = await prisma.user.findMany({
      select: { id: true, phoneHash: true, passwordHash: true, blob: true },
    })
    const user = await (async () => {
      for (const u of users) {
        if (await verifyPhone(phone, u.phoneHash)) return u
      }
      return null
    })()

    if (!user) {
      return NextResponse.json({ data: null, error: 'Неверный номер или пароль' }, { status: 401 })
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return NextResponse.json({ data: null, error: 'Неверный номер или пароль' }, { status: 401 })
    }

    // Проверяем бан
    try {
      const banRow = await prisma.$queryRaw<{ banned_at: Date | null }[]>`
        SELECT banned_at FROM users WHERE id = ${user.id} LIMIT 1
      `
      if (banRow[0]?.banned_at) {
        const res = NextResponse.json({ data: null, error: 'banned' }, { status: 403 })
        res.cookies.set('qvor_banned', '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
        return res
      }
    } catch { /* колонки нет */ }

    const code = generateOtp()
    await saveOtp(phone, code)
    await sendOtp(phone, code)

    logger.info('OTP sent after login', { userId: user.id })
    return NextResponse.json({ data: { otpSent: true }, error: null })
  } catch (err) {
    logger.error('login error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
