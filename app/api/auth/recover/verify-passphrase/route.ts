import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPassword, verifyPhone } from '@/lib/auth/password'
import { isMockEnabled, findMockUserByPhone } from '@/lib/dev/mock-users'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\d{7,15}$/),
  passphrase: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, passphrase } = parsed.data

    if (isMockEnabled()) {
      const mockUser = findMockUserByPhone(phone)
      if (mockUser) {
        // В моке кодовая фраза = "recovery123"
        if (passphrase !== 'recovery123') {
          return NextResponse.json({ data: null, error: 'Неверная кодовая фраза' }, { status: 400 })
        }
        return NextResponse.json({ data: { valid: true }, error: null })
      }
    }

    const users = await prisma.user.findMany({
      select: { phoneHash: true, passwordHash: true },
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

    // blobRecovery расшифровывается на клиенте — здесь только проверяем хэш кодовой фразы
    const valid = await verifyPassword(passphrase, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ data: null, error: 'Неверная кодовая фраза' }, { status: 400 })
    }

    logger.info('Passphrase verified', { phone: phone.slice(0, 4) + '****' })
    return NextResponse.json({ data: { valid: true }, error: null })
  } catch (err) {
    logger.error('recover/verify-passphrase error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
