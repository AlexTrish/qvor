import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const follows = await prisma.follow.findMany({
    where: { followerId: id },
    include: {
      following: {
        select: {
          id: true, username: true, displayName: true, avatarUrl: true,
          isOnline: true, lastSeenAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = follows.map((f: typeof follows[number]) => ({
    ...f.following,
    lastSeenAt: f.following.lastSeenAt?.toISOString() ?? null,
  }))

  return NextResponse.json({ data, error: null })
}
