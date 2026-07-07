import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtp } from '@/lib/auth/otp'
import { verifyPhone } from '@/lib/auth/password'
import { isMockEnabled, findMockUserByPhone, MOCK_OTP } from '@/lib/dev/mock-users'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\d{7,15}$/),
  otpCode: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, otpCode } = parsed.data

    if (isMockEnabled()) {
      const mockUser = findMockUserByPhone(phone)
      if (mockUser) {
        if (otpCode !== MOCK_OTP) {
          return NextResponse.json({ data: null, error: 'Неверный код' }, { status: 400 })
        }
        return NextResponse.json({ data: { recoveryHint: mockUser.recoveryHint }, error: null })
      }
    }

    const otpValid = await verifyOtp(`otp:${phone}`, otpCode)
    if (!otpValid) {
      return NextResponse.json({ data: null, error: 'Неверный или истёкший код' }, { status: 400 })
    }

    const users = await prisma.user.findMany({ select: { phoneHash: true, recoveryHint: true } })
    const user = await (async () => {
      for (const u of users) {
        if (await verifyPhone(phone, u.phoneHash)) return u
      }
      return null
    })()

    if (!user) {
      return NextResponse.json({ data: null, error: 'Пользователь не найден' }, { status: 404 })
    }

    logger.info('Recovery OTP verified', { phone: phone.slice(0, 4) + '****' })
    return NextResponse.json({ data: { recoveryHint: user.recoveryHint }, error: null })
  } catch (err) {
    logger.error('recover/verify-otp error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
