import { type NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/schemas/auth'
import { hashPassword, hashPhone } from '@/lib/auth/password'
import { verifyOtp } from '@/lib/auth/otp'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { apiLogger as logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone: rawPhone, password, passphrase, recoveryHint, publicKey, blob, blobRecovery, otpCode, regToken, telegramId } = parsed.data
    const phone = rawPhone.replace(/^\+/, '')

    // Верификация: OTP или regToken (авторизация через бота)
    if (regToken) {
      const row = await prisma.tempStore.findUnique({ where: { key: `tgauth:reg:${regToken}` } })
      if (!row || row.expiresAt < new Date() || row.value !== phone) {
        return NextResponse.json({ data: null, error: 'Неверный или истёкший токен' }, { status: 400 })
      }
      await prisma.tempStore.delete({ where: { key: `tgauth:reg:${regToken}` } }).catch(() => null)
    } else {
      const otpValid = await verifyOtp(`otp:${phone}`, otpCode!)
      if (!otpValid) {
        return NextResponse.json({ data: null, error: 'Неверный или истёкший код' }, { status: 400 })
      }
    }

    const [phoneHash, passwordHash, blobRecoveryHash] = await Promise.all([
      hashPhone(phone),
      hashPassword(password),
      hashPassword(passphrase),
    ])

    // Вычисляем следующий numericId: MAX + 1, минимум 100001
    const maxResult = await prisma.user.aggregate({ _max: { numericId: true } })
    const nextNumericId = Math.max((maxResult._max.numericId ?? 100000) + 1, 100001)

    const user = await prisma.user.create({
      data: {
        numericId: nextNumericId,
        phoneHash,
        passwordHash,
        blob,
        blobRecovery: blobRecoveryHash,
        recoveryHint,
        publicKey,
        role: 'USER',
        ...(telegramId && { telegramId: BigInt(telegramId) }),
      },
      select: { id: true, numericId: true, createdAt: true },
    })

    const accessToken = await signAccessToken({
      userId: user.id,
      phone,
      role: 'USER',
      createdAt: user.createdAt.toISOString(),
    })
    const refreshToken = await signRefreshToken({ userId: user.id, phone, role: 'USER' })
    await setAuthCookies(accessToken, refreshToken)

    logger.info('User registered', { userId: user.id })
    return NextResponse.json({ data: { userId: user.id }, error: null }, { status: 201 })
  } catch (err) {
    logger.error('register error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
