import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword, verifyPhone } from '@/lib/auth/password'
import { isMockEnabled, findMockUserByPhone } from '@/lib/dev/mock-users'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\d{7,15}$/),
  passphrase: z.string().min(1),
  newPassword: z.string().min(8),
  newBlob: z.string().optional(), // клиент передаёт перешифрованный blob
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, newPassword, newBlob } = parsed.data

    if (isMockEnabled()) {
      const mockUser = findMockUserByPhone(phone)
      if (mockUser) {
        logger.debug('Mock password reset', { userId: mockUser.id })
        return NextResponse.json({ data: { reset: true }, error: null })
      }
    }

    const users = await prisma.user.findMany({
      select: { id: true, phoneHash: true },
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

    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(newBlob && { blob: newBlob }),
      },
    })

    logger.info('Password reset', { userId: user.id })
    return NextResponse.json({ data: { reset: true }, error: null })
  } catch (err) {
    logger.error('recover/reset-password error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
