import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { broker } from '@/lib/sse/broker'
import { z } from 'zod'

const sendSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)

  const messages = await prisma.message.findMany({
    where: { channelId: id, deletedAt: null },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, senderId: true, channelId: true, ciphertext: true, iv: true,
      createdAt: true, editedAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  })

  return NextResponse.json({
    data: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0].id : null,
    error: null,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  const body = await request.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const message = await prisma.message.create({
    data: { senderId: user.id, channelId: id, ciphertext: parsed.data.ciphertext, iv: parsed.data.iv },
    select: {
      id: true, senderId: true, channelId: true, ciphertext: true, iv: true, createdAt: true, editedAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  // Push to all channel members + increment unread
  const members = await prisma.channelMember.findMany({ where: { channelId: id }, select: { userId: true } })
  await Promise.all(members
    .filter((m: { userId: string }) => m.userId !== user.id)
    .map((m: { userId: string }) => {
      broker.publish(m.userId, { type: 'msg', data: message as Record<string, unknown> })
      return prisma.channelMember.update({
        where: { channelId_userId: { channelId: id, userId: m.userId } },
        data: { unreadCount: { increment: 1 } },
      })
    })
  )

  return NextResponse.json({ data: message, error: null }, { status: 201 })
}
