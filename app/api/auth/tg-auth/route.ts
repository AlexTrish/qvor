import { type NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { apiLogger as logger } from '@/lib/logger'

// POST — создаёт токен для авторизации через Telegram бота
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут

    await prisma.tempStore.create({
      data: { key: `tgauth:${token}`, value: 'pending', expiresAt },
    })

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'qvor_bot'
    const deeplink = `https://t.me/${botUsername}?start=tgauth_${token}`

    logger.info('TG auth token created')
    return NextResponse.json({ data: { token, deeplink }, error: null })
  } catch (err) {
    logger.error('tg-auth create error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
