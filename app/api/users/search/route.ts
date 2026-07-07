import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'

const schema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().min(1).max(20).default(10),
})

export async function GET(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const parsed = schema.safeParse({ q: searchParams.get('q'), limit: searchParams.get('limit') })
  if (!parsed.success) return NextResponse.json({ data: null, error: 'Invalid' }, { status: 400 })

  const { q, limit } = parsed.data
  const clean = q.startsWith('@') ? q.slice(1) : q
  const isNumeric = /^\d+$/.test(clean)

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      OR: [
        ...(isNumeric ? [{ numericId: parseInt(clean, 10) }] : []),
        { username: { contains: clean, mode: 'insensitive' as const } },
        { displayName: { contains: clean, mode: 'insensitive' as const } },
      ],
    },
    select: {
      id: true,
      numericId: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      isOnline: true,
      lastSeenAt: true,
    },
    take: limit,
  })

  return NextResponse.json({
    data: users.map((u: typeof users[number]) => ({ ...u, lastSeenAt: u.lastSeenAt?.toISOString() ?? null })),
    error: null,
  })
}
