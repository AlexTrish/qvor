import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stripHtml } from '@/lib/utils'

const createSchema = z.object({
  dataUrl: z.string().min(1).max(10 * 1024 * 1024),
  caption: z.string().max(200).optional(),
})

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // IDs пользователей, на которых подписан текущий пользователь
  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  })
  const followingIds = following.map((f: { followingId: string }) => f.followingId)

  // Свои истории + истории подписок
  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: now },
      userId: { in: [user.id, ...followingIds] },
    },
    include: {
      user: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
      views: { where: { userId: user.id }, select: { viewedAt: true } },
      _count: { select: { views: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group by user
  const grouped = new Map<string, {
    user: typeof stories[0]['user']
    stories: { id: string; dataUrl: string; caption: string | null; createdAt: string; expiresAt: string; viewed: boolean; viewCount: number }[]
    hasUnviewed: boolean
  }>()

  for (const s of stories) {
    const viewed = s.views.length > 0
    const entry = grouped.get(s.userId) ?? { user: s.user, stories: [], hasUnviewed: false }
    entry.stories.push({
      id: s.id, dataUrl: s.dataUrl, caption: s.caption,
      createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(),
      viewed, viewCount: s._count.views,
    })
    if (!viewed) entry.hasUnviewed = true
    grouped.set(s.userId, entry)
  }

  // Own first, then unviewed, then viewed
  const result = [...grouped.values()].sort((a, b) => {
    if (a.user.id === user.id) return -1
    if (b.user.id === user.id) return 1
    if (a.hasUnviewed && !b.hasUnviewed) return -1
    if (!a.hasUnviewed && b.hasUnviewed) return 1
    return 0
  })

  return NextResponse.json({ data: result, error: null })
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const story = await prisma.story.create({
    data: {
      userId: user.id,
      dataUrl: parsed.data.dataUrl,
      caption: parsed.data.caption ? stripHtml(parsed.data.caption) : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({ data: story, error: null }, { status: 201 })
}
