import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'

const SELECT_USER = {
  id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeenAt: true,
}

// GET /api/friends?userId=...&type=friends|followers|following|stats
export async function GET(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const targetId = searchParams.get('userId') ?? user.id
  const type = searchParams.get('type') ?? 'stats'

  if (type === 'stats') {
    const [friends, followers, following] = await Promise.all([
      // Друзья — ACCEPTED в любую сторону
      prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ senderId: targetId }, { receiverId: targetId }],
        },
      }),
      // Подписчики — отправили заявку, но не приняты
      prisma.friendship.count({
        where: { receiverId: targetId, status: 'PENDING' },
      }),
      // Подписки — текущий пользователь отправил заявку
      prisma.friendship.count({
        where: { senderId: targetId, status: 'PENDING' },
      }),
    ])
    return NextResponse.json({ data: { friends, followers, following }, error: null })
  }

  if (type === 'friends') {
    const rows = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ senderId: targetId }, { receiverId: targetId }] },
      include: { sender: { select: SELECT_USER }, receiver: { select: SELECT_USER } },
    })
    type FriendRow = typeof rows[number]
    const users = rows.map((r: FriendRow) => r.senderId === targetId ? r.receiver : r.sender)
    return NextResponse.json({ data: users, error: null })
  }

  if (type === 'followers') {
    const rows = await prisma.friendship.findMany({
      where: { receiverId: targetId, status: 'PENDING' },
      include: { sender: { select: SELECT_USER } },
    })
    type FollowerRow = typeof rows[number]
    return NextResponse.json({ data: rows.map((r: FollowerRow) => ({ ...r.sender, friendshipId: r.id })), error: null })
  }

  if (type === 'following') {
    const rows = await prisma.friendship.findMany({
      where: { senderId: targetId, status: 'PENDING' },
      include: { receiver: { select: SELECT_USER } },
    })
    type FollowingRow = typeof rows[number]
    return NextResponse.json({ data: rows.map((r: FollowingRow) => ({ ...r.receiver, friendshipId: r.id })), error: null })
  }

  return NextResponse.json({ data: null, error: 'Invalid type' }, { status: 400 })
}

// POST /api/friends — отправить заявку
export async function POST(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { receiverId } = z.object({ receiverId: z.string().uuid() }).parse(await req.json())
  if (receiverId === user.id) return NextResponse.json({ data: null, error: 'Cannot add yourself' }, { status: 400 })

  // Проверяем обратную заявку — если есть, сразу принимаем
  const reverse = await prisma.friendship.findUnique({
    where: { senderId_receiverId: { senderId: receiverId, receiverId: user.id } },
  })

  if (reverse) {
    const updated = await prisma.friendship.update({
      where: { id: reverse.id },
      data: { status: 'ACCEPTED' },
    })
    return NextResponse.json({ data: { status: 'ACCEPTED', id: updated.id }, error: null })
  }

  const existing = await prisma.friendship.findUnique({
    where: { senderId_receiverId: { senderId: user.id, receiverId } },
  })
  if (existing) return NextResponse.json({ data: { status: existing.status, id: existing.id }, error: null })

  const friendship = await prisma.friendship.create({
    data: { senderId: user.id, receiverId, status: 'PENDING' },
  })
  return NextResponse.json({ data: { status: 'PENDING', id: friendship.id }, error: null }, { status: 201 })
}
