import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ data: [] })

  const channels = await prisma.channel.findMany({
    where: {
      isPrivate: false,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: { _count: { select: { members: true } } },
    take: 20,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    data: channels.map((c: { id: string; name: string; description: string | null; avatarUrl: string | null; isPrivate: boolean; type: string; category: string; _count: { members: number } }) => ({
      id: c.id, name: c.name, description: c.description,
      avatarUrl: c.avatarUrl, isPrivate: c.isPrivate, type: c.type,
      category: c.category, memberCount: c._count.members,
    })),
  })
}
