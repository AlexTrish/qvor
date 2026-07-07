import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// POST /api/auth/device-link
// Тело: { action: 'init' } — новое устройство генерирует ephemeral ключ, получает токен
// Тело: { action: 'transfer', token, encryptedPrivateKey } — старое устройство передаёт зашифрованный privateKey
// GET  /api/auth/device-link?token= — новое устройство поллит готовность

const initSchema = z.object({ action: z.literal('init'), ephemeralPublicKey: z.string().min(1) })
const transferSchema = z.object({ action: z.literal('transfer'), token: z.string().min(1), encryptedPrivateKey: z.string().min(1) })

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'init') {
    // Новое устройство: сохраняем ephemeral публичный ключ, возвращаем токен
    const parsed = initSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ data: null, error: 'Invalid' }, { status: 400 })

    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут

    await prisma.tempStore.upsert({
      where: { key: `devlink:${token}` },
      update: { value: JSON.stringify({ ephemeralPublicKey: parsed.data.ephemeralPublicKey, encryptedPrivateKey: null }), expiresAt },
      create: { key: `devlink:${token}`, value: JSON.stringify({ ephemeralPublicKey: parsed.data.ephemeralPublicKey, encryptedPrivateKey: null }), expiresAt },
    })

    return NextResponse.json({ data: { token }, error: null })
  }

  if (body.action === 'transfer') {
    // Старое устройство: авторизовано, передаёт зашифрованный privateKey
    const user = await auth(req)
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ data: null, error: 'Invalid' }, { status: 400 })

    const row = await prisma.tempStore.findUnique({ where: { key: `devlink:${parsed.data.token}` } })
    if (!row || row.expiresAt < new Date()) {
      return NextResponse.json({ data: null, error: 'Token expired' }, { status: 410 })
    }

    const existing = JSON.parse(row.value)
    await prisma.tempStore.update({
      where: { key: `devlink:${parsed.data.token}` },
      data: {
        value: JSON.stringify({ ...existing, encryptedPrivateKey: parsed.data.encryptedPrivateKey, userId: user.id }),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    return NextResponse.json({ data: { ok: true }, error: null })
  }

  return NextResponse.json({ data: null, error: 'Invalid action' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ data: null, error: 'Missing token' }, { status: 400 })

  const row = await prisma.tempStore.findUnique({ where: { key: `devlink:${token}` } })
  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json({ data: { status: 'expired' }, error: null })
  }

  const data = JSON.parse(row.value)

  if (!data.encryptedPrivateKey) {
    // Возвращаем ephemeral публичный ключ для QR-кода
    return NextResponse.json({ data: { status: 'pending', ephemeralPublicKey: data.ephemeralPublicKey }, error: null })
  }

  // Готово — удаляем токен и возвращаем зашифрованный ключ
  await prisma.tempStore.delete({ where: { key: `devlink:${token}` } }).catch(() => null)
  return NextResponse.json({ data: { status: 'ready', encryptedPrivateKey: data.encryptedPrivateKey, userId: data.userId }, error: null })
}
