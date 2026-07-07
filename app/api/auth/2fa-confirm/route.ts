import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPhone } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { setAuthCookies } from '@/lib/auth/cookies'
import { rateLimit } from '@/lib/rate-limit'
import { apiLogger as logger } from '@/lib/logger'
import { sendTelegramMessage } from '@/lib/bot/send-otp'
import crypto from 'crypto'

const schema = z.object({
  phone: z.string().min(7),
  action: z.enum(['request', 'poll']),
  token: z.string().optional(),
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

    const { phone: rawPhone, action, token } = parsed.data
    const phone = rawPhone.replace(/^\+/, '')

    if (action === 'request') {
      // Ищем chatId пользователя
      const chatRow = await prisma.tempStore.findUnique({
        where: { key: `tg:chat:${phone}` },
      })
      if (!chatRow || chatRow.expiresAt < new Date()) {
        return NextResponse.json({ data: null, error: 'TELEGRAM_NOT_LINKED' }, { status: 400 })
      }

      const chatId = chatRow.value
      const confirmToken = crypto.randomBytes(16).toString('hex')
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3 минуты

      await prisma.tempStore.upsert({
        where: { key: `2fa:${confirmToken}` },
        update: { value: phone, expiresAt },
        create: { key: `2fa:${confirmToken}`, value: phone, expiresAt },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://qvor.ru'
      const ru = /^7/.test(phone)
      const text = ru
        ? `🔐 *Подтверждение входа*\n\nКто\\-то входит в ваш аккаунт QVOR\\.\n\nЕсли это вы — нажмите кнопку ниже\\.\n\n_Ссылка действует 3 минуты\\._`
        : `🔐 *Login confirmation*\n\nSomeone is signing into your QVOR account\\.\n\nIf that's you — tap the button below\\.\n\n_Link expires in 3 minutes\\._`

      await sendTelegramMessage(chatId, text, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[{
            text: ru ? '✅ Подтвердить вход' : '✅ Confirm login',
            url: `${appUrl}/api/auth/2fa-confirm?token=${confirmToken}&approve=1`,
          }]],
        },
      })

      logger.info('2FA confirmation sent', { phone: phone.slice(0, 4) + '****' })
      return NextResponse.json({ data: { confirmToken }, error: null })
    }

    if (action === 'poll') {
      if (!token) return NextResponse.json({ data: null, error: 'Missing token' }, { status: 400 })

      const row = await prisma.tempStore.findUnique({ where: { key: `2fa:approved:${token}` } })
      if (!row || row.expiresAt < new Date()) {
        return NextResponse.json({ data: { approved: false }, error: null })
      }

      // Подтверждено — выдаём JWT
      const approvedPhone = row.value
      await prisma.tempStore.delete({ where: { key: `2fa:approved:${token}` } }).catch(() => null)

      const users = await prisma.user.findMany({
        select: { id: true, phoneHash: true, blob: true, username: true, role: true, createdAt: true },
      })
      const user = await (async () => {
        for (const u of users) {
          if (await verifyPhone(approvedPhone, u.phoneHash)) return u
        }
        return null
      })()

      if (!user) return NextResponse.json({ data: null, error: 'User not found' }, { status: 404 })

      const accessToken = await signAccessToken({
        userId: user.id, phone: approvedPhone,
        role: user.role as 'USER' | 'SUPER_ADMIN',
        username: user.username ?? undefined,
        createdAt: user.createdAt.toISOString(),
      })
      const refreshToken = await signRefreshToken({
        userId: user.id, phone: approvedPhone,
        role: user.role as 'USER' | 'SUPER_ADMIN',
      })
      await setAuthCookies(accessToken, refreshToken)

      logger.info('2FA login approved', { userId: user.id })
      return NextResponse.json({ data: { approved: true, userId: user.id, blob: user.blob }, error: null })
    }

    return NextResponse.json({ data: null, error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    logger.error('2fa-confirm error', { err })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

// GET — вызывается из inline кнопки в Telegram
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token = searchParams.get('token')
  const approve = searchParams.get('approve')

  if (!token || approve !== '1') {
    return new Response('Invalid request', { status: 400 })
  }

  const row = await prisma.tempStore.findUnique({ where: { key: `2fa:${token}` } })
  if (!row || row.expiresAt < new Date()) {
    return new Response('Link expired', { status: 410 })
  }

  const phone = row.value
  await prisma.tempStore.delete({ where: { key: `2fa:${token}` } }).catch(() => null)
  await prisma.tempStore.upsert({
    where: { key: `2fa:approved:${token}` },
    update: { value: phone, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    create: { key: `2fa:approved:${token}`, value: phone, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  })

  return new Response(`
    <html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>✅ Вход подтверждён</h2>
      <p>Можете закрыть это окно.</p>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } })
}
