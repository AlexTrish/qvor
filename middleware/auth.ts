import { type NextRequest } from 'next/server'
import { verifyToken, type UserRole } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

export type AuthUser = {
  id: string
  numericId: number
  phoneHash: string
  username?: string | null
  displayName?: string | null
  bio?: string | null
  avatarUrl?: string | null
  isOnline: boolean
  lastSeenAt?: string | null
  createdAt: string
  role: UserRole
}

export async function auth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('access_token')?.value
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload.userId) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        numericId: true,
        phoneHash: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
        role: true,
      },
    })

    if (!user) return null

    // Обновляем lastSeenAt и isOnline асинхронно, не блокируем ответ
    prisma.user.update({
      where: { id: payload.userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    }).catch(() => null)

    return {
      ...user,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    }
  } catch {
    return null
  }
}
