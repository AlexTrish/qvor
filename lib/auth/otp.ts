import 'server-only'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const OTP_TTL = 300 // 5 минут
const OTP_LENGTH = 6

export type OtpChannel = 'email' | 'console'

export function generateOtp(): string {
  const digits = Array.from(crypto.getRandomValues(new Uint8Array(OTP_LENGTH)))
  return digits.map((b) => b % 10).join('')
}

export async function saveOtp(phone: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000)
  await prisma.tempStore.upsert({
    where: { key: `otp:${phone}` },
    update: { value: code, expiresAt },
    create: { key: `otp:${phone}`, value: code, expiresAt },
  })
  logger.debug('OTP saved', { phone: phone.slice(0, 4) + '****' })
}

export async function storeOtp(key: string, code: string): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000)
  await prisma.tempStore.upsert({
    where: { key },
    update: { value: code, expiresAt },
    create: { key, value: code, expiresAt },
  })
  logger.debug('OTP stored', { key: key.replace(/:.+/, ':***') })
}

export async function verifyOtp(key: string, code: string): Promise<boolean> {
  const row = await prisma.tempStore.findUnique({ where: { key } })
  if (!row) return false
  if (row.expiresAt < new Date()) {
    await prisma.tempStore.delete({ where: { key } }).catch(() => null)
    return false
  }
  if (row.value !== code) return false
  await prisma.tempStore.delete({ where: { key } }).catch(() => null)
  return true
}

// Отправляет OTP — email если есть, иначе только консоль PM2
export async function sendOtp(phone: string, code: string, preferredChannel?: 'email' | 'telegram' | 'console'): Promise<OtpChannel> {
  const bcrypt = await import('bcryptjs')
  const users = await prisma.user.findMany({
    select: { id: true, phoneHash: true, email: true },
    where: { NOT: { id: '00000000-0000-0000-0000-000000000001' } },
  })

  type UserRow = { id: string; phoneHash: string; email: string | null }
  const user = (await Promise.all(
    users.map(async (u: UserRow) => ({ u, match: await bcrypt.compare(phone, u.phoneHash) }))
  )).find((x: { u: UserRow; match: boolean }) => x.match)?.u ?? null

  // Всегда выводим в консоль PM2
  console.log(`[QVOR OTP] phone=${phone.slice(0, 4)}**** code=${code}${user ? ` userId=${user.id}` : ''}`)
  logger.info('OTP code generated', { phone: phone.slice(0, 4) + '****' })

  // Если есть email и предпочтение email — отправляем туда
  if (user?.email && (preferredChannel === 'email' || !preferredChannel)) {
    await sendEmailOtp(user.email, code).catch(() => null)
    return 'email'
  }

  return 'console'
}

export async function sendLoginNotification(phone: string, device: string): Promise<void> {
  try {
    const bcrypt = await import('bcryptjs')
    const users = await prisma.user.findMany({
      select: { id: true, phoneHash: true, email: true },
      where: { NOT: { id: '00000000-0000-0000-0000-000000000001' } },
    })
    type UserRow = { id: string; phoneHash: string; email: string | null }
    const user = (await Promise.all(
      users.map(async (u: UserRow) => ({ u, match: await bcrypt.compare(phone, u.phoneHash) }))
    )).find((x: { u: UserRow; match: boolean }) => x.match)?.u ?? null
    if (!user) return

    console.log(`[QVOR LOGIN] userId=${user.id} device=${device.slice(0, 60)}`)

    if (user.email) {
      await sendEmailOtp(user.email, `Вход с устройства: ${device.slice(0, 100)}`).catch(() => null)
    }
  } catch {}
}

export async function isTelegramLinked(phone: string): Promise<boolean> {
  const row = await prisma.tempStore.findUnique({ where: { key: `tg:chat:${phone}` } })
  return !!row && row.expiresAt > new Date()
}

export async function saveTelegramLink(token: string, phone: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.tempStore.upsert({
    where: { key: `tg:link:${token}` },
    update: { value: phone, expiresAt },
    create: { key: `tg:link:${token}`, value: phone, expiresAt },
  })
}

export async function sendEmailOtp(email: string, code: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL
  if (!smtpUrl) {
    console.log(`[QVOR OTP EMAIL] to=${email} code=${code}`)
    return
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport(smtpUrl)
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@qvor.ru',
      to: email,
      subject: 'Код подтверждения QVOR',
      text: `Ваш код подтверждения: ${code}\n\nДействителен 5 минут. Никому не сообщайте его.`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;font-size:20px">🔐 Код подтверждения QVOR</h2>
          <div style="background:#f5f5f5;border-radius:12px;padding:20px;text-align:center;margin:16px 0">
            <span style="font-size:32px;font-weight:900;letter-spacing:8px;font-family:monospace">${code}</span>
          </div>
          <p style="color:#666;font-size:14px;margin:0">Действителен 5 минут. Никому не сообщайте его.</p>
        </div>
      `,
    })
    logger.info('OTP sent via email', { email: email.replace(/(.{2}).*@/, '$1***@') })
  } catch (err) {
    logger.error('Email OTP send failed', { err: String(err) })
    console.log(`[QVOR OTP EMAIL FALLBACK] to=${email} code=${code}`)
  }
}
