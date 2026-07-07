import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 30), 100)
  const cursor = searchParams.get('cursor')

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  const hasMore = notifications.length > limit
  const items = hasMore ? notifications.slice(0, limit) : notifications
  const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false } })

  return NextResponse.json({
    data: items,
    nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    unreadCount,
    error: null,
  })
}

export async function PATCH(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  // Mark all as read
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
  return NextResponse.json({ data: { updated: true }, error: null })
}
