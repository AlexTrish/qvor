import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveTelegramLink } from '@/lib/auth/otp'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\d{7,15}$/),
})

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone } = parsed.data
    const token = crypto.randomUUID().replace(/-/g, '')
    await saveTelegramLink(token, phone)

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'qvor_bot'
    const deeplink = `https://t.me/${botUsername}?start=${token}`

    logger.info('Telegram link generated', { phone: phone.slice(0, 4) + '****' })
    return NextResponse.json({ data: { deeplink, token }, error: null })
  } catch (err) {
    logger.error('telegram-link error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
