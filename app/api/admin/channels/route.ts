import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  q:     z.string().optional(),
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

type ChannelRow = {
  id: string; name: string; description: string | null; avatarUrl: string | null
  isPrivate: boolean; type: string; category: string; createdAt: Date
  _count: { members: number; messages: number }
  members: { user: { id: string; username: string | null; displayName: string | null } }[]
}

export async function GET(request: NextRequest) {
  const { error } = await adminAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const { q, page, limit } = schema.parse({
    q:     searchParams.get('q')     ?? undefined,
    page:  searchParams.get('page')  ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  const where = q ? {
    OR: [
      { name:        { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const [total, channels] = await Promise.all([
    prisma.channel.count({ where }),
    prisma.channel.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, description: true, avatarUrl: true,
        isPrivate: true, type: true, category: true, createdAt: true,
        _count: { select: { members: true, messages: true } },
        members: {
          where: { role: 'OWNER' },
          take: 1,
          select: { user: { select: { id: true, username: true, displayName: true } } },
        },
      },
    }),
  ])

  return NextResponse.json({
    data: channels.map((c: ChannelRow) => ({
      id: c.id, name: c.name, description: c.description,
      avatarUrl: c.avatarUrl, isPrivate: c.isPrivate, type: c.type,
      category: c.category, createdAt: c.createdAt.toISOString(),
      memberCount: c._count.members, messageCount: c._count.messages,
      owner: c.members[0]?.user ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
