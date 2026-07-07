import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPhone } from '@/lib/auth/password'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\d{7,15}$/),
  telegramId: z.number(),
  chatId: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, telegramId } = parsed.data

    const users = await prisma.user.findMany({ select: { id: true, phoneHash: true } })
    const user = await (async () => {
      for (const u of users) {
        if (await verifyPhone(phone, u.phoneHash)) return u
      }
      return null
    })()

    if (!user) {
      // Пользователь не найден — сохраним привязку когда зарегистрируется
      return NextResponse.json({ data: { bound: false }, error: null })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: BigInt(telegramId) },
    })

    logger.info('Telegram bound to account', { userId: user.id, telegramId })
    return NextResponse.json({ data: { bound: true }, error: null })
  } catch (err) {
    logger.error('telegram-bind error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
