import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash, createHmac } from 'crypto'
import { signAccessToken, signRefreshToken, type UserRole } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const schema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
})

function verifyTelegramHash(data: Record<string, string>, hash: string): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN!
  const secret = createHash('sha256').update(botToken).digest()
  const checkString = Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')
  return createHmac('sha256', secret).update(checkString).digest('hex') === hash
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Неверные данные' }, { status: 400 })
    }

    const { id, first_name, username, photo_url, auth_date, hash, ...rest } = parsed.data

    if (Date.now() / 1000 - auth_date > 86400) {
      return NextResponse.json({ data: null, error: 'Данные устарели' }, { status: 400 })
    }

    const dataToVerify: Record<string, string> = {
      id: String(id),
      first_name,
      auth_date: String(auth_date),
      ...(username && { username }),
      ...(photo_url && { photo_url }),
      ...rest,
    }

    if (!verifyTelegramHash(dataToVerify, hash)) {
      return NextResponse.json({ data: null, error: 'Неверная подпись' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { telegramId: BigInt(id) },
      select: { id: true, blob: true, role: true, username: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({
        data: null,
        error: 'TELEGRAM_NOT_BOUND',
        meta: { telegramId: id, firstName: first_name, username },
      }, { status: 404 })
    }

    const role = user.role as UserRole
    const accessToken = await signAccessToken({
      userId: user.id,
      phone: '',
      role,
      username: user.username ?? undefined,
      createdAt: user.createdAt.toISOString(),
    })
    const refreshToken = await signRefreshToken({ userId: user.id, phone: '', role })
    await setAuthCookies(accessToken, refreshToken)

    logger.info('User logged in via Telegram', { userId: user.id, telegramId: id })
    return NextResponse.json({ data: { userId: user.id, blob: user.blob }, error: null })
  } catch (err) {
    logger.error('telegram-login error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
