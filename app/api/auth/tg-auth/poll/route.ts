import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { verifyPhone } from '@/lib/auth/password'
import { apiLogger as logger } from '@/lib/logger'

// GET /api/auth/tg-auth/poll?token=xxx
// Возвращает:
//   { status: 'pending' }                          — ещё ждём
//   { status: 'ready', mode: 'login', blob }       — пользователь найден, входим
//   { status: 'ready', mode: 'register', phone }   — новый пользователь, нужна регистрация
//   { status: 'expired' }                          — токен истёк
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ data: null, error: 'Missing token' }, { status: 400 })

  try {
    const row = await prisma.tempStore.findUnique({ where: { key: `tgauth:${token}` } })

    if (!row || row.expiresAt < new Date()) {
      await prisma.tempStore.delete({ where: { key: `tgauth:${token}` } }).catch(() => null)
      return NextResponse.json({ data: { status: 'expired' }, error: null })
    }

    if (row.value === 'pending') {
      return NextResponse.json({ data: { status: 'pending' }, error: null })
    }

    // value = phone number (бот записал номер)
    const phone = row.value
    await prisma.tempStore.delete({ where: { key: `tgauth:${token}` } }).catch(() => null)

    // Ищем пользователя по номеру
    const users = await prisma.user.findMany({
      select: { id: true, phoneHash: true, blob: true, role: true, createdAt: true, username: true },
    })
    let found: (typeof users)[0] | null = null
    for (const u of users) {
      if (await verifyPhone(phone, u.phoneHash)) { found = u; break }
    }

    if (found) {
      // Проверяем бан
      try {
        const banRow = await prisma.$queryRaw<{ banned_at: Date | null }[]>`
          SELECT banned_at FROM users WHERE id = ${found.id} LIMIT 1
        `
        if (banRow[0]?.banned_at) {
          const res = NextResponse.json({ data: null, error: 'banned' }, { status: 403 })
          res.cookies.set('qvor_banned', '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
          return res
        }
      } catch { /* колонки нет */ }

      // Логиним — выставляем куки
      const accessToken = await signAccessToken({
        userId: found.id,
        phone,
        role: found.role as 'USER' | 'SUPER_ADMIN',
        createdAt: found.createdAt.toISOString(),
      })
      const refreshToken = await signRefreshToken({ userId: found.id, phone, role: found.role as 'USER' | 'SUPER_ADMIN' })
      const response = NextResponse.json({
        data: { status: 'ready', mode: 'login', blob: found.blob, userId: found.id },
        error: null,
      })
      await setAuthCookies(accessToken, refreshToken)
      logger.info('TG auth login success', { userId: found.id })
      return response
    }

    // Новый пользователь — возвращаем номер для регистрации
    // Сохраняем временный токен подтверждения (номер верифицирован ботом)
    const regToken = crypto.randomUUID().replace(/-/g, '')
    await prisma.tempStore.create({
      data: {
        key: `tgauth:reg:${regToken}`,
        value: phone,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    })
    return NextResponse.json({ data: { status: 'ready', mode: 'register', phone, regToken }, error: null })
  } catch (err) {
    logger.error('tg-auth poll error', { err })
    return NextResponse.json({ data: null, error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
