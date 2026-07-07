import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { auth } from '@/middleware/auth'
import { broker } from '@/lib/sse/broker'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/utils'

const updateSchema = z.object({
  username: z.string().regex(/^\w{3,20}$/).optional().nullable(),
  displayName: z.string().min(1).max(50).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().max(2 * 1024 * 1024).optional().nullable(),
  bannerConfig: z.string().max(1000).optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  hideOnline: z.boolean().optional(),
  email: z.string().email().optional().nullable(),
  privacySettings: z.object({
    whoCanSeeLastSeen: z.enum(['nobody', 'contacts', 'everyone']).optional(),
    whoCanSeeBio: z.enum(['nobody', 'contacts', 'everyone']).optional(),
    whoCanSeePhone: z.enum(['nobody', 'contacts', 'everyone']).optional(),
    whoCanAddToGroups: z.enum(['nobody', 'contacts', 'everyone']).optional(),
  }).optional(),
})

const SELECT = {
  id: true,
  numericId: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerConfig: true,
  blob: true,
  isOnline: true,
  hideOnline: true,
  privacySettings: true,
  lastSeenAt: true,
  createdAt: true,
  telegramId: true,
  recoveryHint: true,
  email: true,
  role: true,
}

// Кэш /api/users/me — TTL 30 сек, инвалидируется при PATCH
const meCache = new Map<string, { data: unknown; at: number }>()
const ME_TTL = 30_000

export function invalidateMeCache(userId: string) {
  meCache.delete(userId)
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем кэш
    const cached = meCache.get(user.id)
    if (cached && Date.now() - cached.at < ME_TTL) {
      return NextResponse.json({ data: cached.data, error: null })
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: SELECT,
    })

    if (!userData) {
      return NextResponse.json({ data: null, error: 'User not found' }, { status: 404 })
    }

    // birthDate — optional field, may not exist in DB yet
    let birthDate: string | null = null
    try {
      const raw = await prisma.$queryRaw<{ birth_date: Date | null }[]>`
        SELECT birth_date FROM users WHERE id = ${user.id} LIMIT 1
      `
      birthDate = raw[0]?.birth_date ? raw[0].birth_date.toISOString().split('T')[0] : null
    } catch { /* column doesn't exist yet */ }

    const responseData = {
      ...userData,
      telegramId: userData.telegramId?.toString() ?? null,
      createdAt: userData.createdAt.toISOString(),
      lastSeenAt: userData.lastSeenAt?.toISOString() ?? null,
      birthDate,
    }

    // Записываем в кэш
    meCache.set(user.id, { data: responseData, at: Date.now() })

    return NextResponse.json({ data: responseData, error: null })
  } catch (error) {
    logger.error('GET /api/users/me error', { error })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'api')
    if (limited) return limited

    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    // Инвалидируем кэш при обновлении профиля
    invalidateMeCache(user.id)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { username, displayName, bio, avatarUrl, bannerConfig, birthDate, hideOnline, privacySettings, email } = parsed.data

    if (username) {
      const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } })
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ data: null, error: 'Username already taken' }, { status: 409 } )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (username !== undefined) updateData.username = username
    if (displayName !== undefined) updateData.displayName = displayName ? stripHtml(displayName) : displayName
    if (bio !== undefined) updateData.bio = bio ? stripHtml(bio) : bio
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (bannerConfig !== undefined) updateData.bannerConfig = bannerConfig
    if (hideOnline !== undefined) updateData.hideOnline = hideOnline
    if (privacySettings !== undefined) updateData.privacySettings = privacySettings
    if (email !== undefined) updateData.email = email

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: SELECT,
    })

    // Update birthDate via raw query if provided
    if (birthDate !== undefined) {
      try {
        if (birthDate) {
          await prisma.$executeRaw`UPDATE users SET birth_date = ${new Date(birthDate)} WHERE id = ${user.id}`
        } else {
          await prisma.$executeRaw`UPDATE users SET birth_date = NULL WHERE id = ${user.id}`
        }
      } catch { /* column doesn't exist yet, ignore */ }
    }

    // Broadcast avatar/name update to all connected users
    if (avatarUrl !== undefined || displayName !== undefined) {
      const connectedUsers = broker.connectedUsers()
      broker.publishMany(connectedUsers, {
        type: 'user_upd',
        data: { id: user.id, avatarUrl: updated.avatarUrl, displayName: updated.displayName },
      })
    }

    return NextResponse.json({
      data: {
        ...updated,
        telegramId: updated.telegramId?.toString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        birthDate: birthDate ?? null,
      },
      error: null,
    })
  } catch (error) {
    logger.error('PATCH /api/users/me error', { error })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
