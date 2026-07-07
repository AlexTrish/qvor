import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [follow, followersCount, followingCount] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: id } },
    }),
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId: id } }),
  ])

  return NextResponse.json({
    data: { isFollowing: !!follow, followersCount, followingCount },
    error: null,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (id === user.id) return NextResponse.json({ data: null, error: 'Cannot follow yourself' }, { status: 400 })

  const follow = await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: id } },
    create: { followerId: user.id, followingId: id },
    update: {},
  })

  // Notify the followed user
  const follower = await prisma.user.findUnique({
    where: { id: user.id },
    select: { displayName: true, username: true },
  })
  const followerName = follower?.displayName || follower?.username || 'Пользователь'
  await prisma.notification.create({
    data: {
      userId: id,
      type: 'follow',
      title: `${followerName} подписался (-ась) на вас`,
      data: { followerId: user.id },
    },
  }).catch(() => null)

  return NextResponse.json({ data: follow, error: null }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.follow.deleteMany({
    where: { followerId: user.id, followingId: id },
  })

  return NextResponse.json({ data: { unfollowed: true }, error: null })
}
