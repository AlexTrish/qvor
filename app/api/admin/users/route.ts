import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  q:     z.string().optional(),
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  const { error } = await adminAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const { q, page, limit } = querySchema.parse({
    q:     searchParams.get('q')     ?? undefined,
    page:  searchParams.get('page')  ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  const where = q ? {
    OR: [
      { username:    { contains: q, mode: 'insensitive' as const } },
      { displayName: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, numericId: true, username: true, displayName: true,
        avatarUrl: true, role: true, isOnline: true, createdAt: true,
        telegramId: true,
        _count: { select: { sentMessages: true } },
      },
    }),
  ])

  // bannedAt — backward-compatible через raw SQL
  let bannedMap: Record<string, string | null> = {}
  try {
    const ids = (users as { id: string }[]).map(u => u.id)
    if (ids.length) {
      const rows = await prisma.$queryRaw<{ id: string; banned_at: Date | null }[]>`
        SELECT id, banned_at FROM users WHERE id = ANY(${ids}::uuid[])
      `
      bannedMap = Object.fromEntries(rows.map((r: { id: string; banned_at: Date | null }) => [r.id, r.banned_at?.toISOString() ?? null]))
    }
  } catch { /* колонки нет */ }

  return NextResponse.json({
    data: users.map((u: { id: string; numericId: number; username: string | null; displayName: string | null; avatarUrl: string | null; role: string; isOnline: boolean; createdAt: Date; telegramId: bigint | null; _count: { sentMessages: number } }) => ({ ...u, bannedAt: bannedMap[u.id] ?? null })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
