import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  peerId: z.string().uuid(),
  callType: z.enum(['audio', 'video']),
  callDuration: z.number().int().min(0).nullable(),
})

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { peerId, callType, callDuration } = parsed.data

  const peer = await prisma.user.findUnique({ where: { id: peerId }, select: { id: true } })
  if (!peer) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId: peerId,
      ciphertext: '[call]',
      iv: 'call',
      callType,
      callDuration,
    },
    select: {
      id: true, senderId: true, receiverId: true,
      ciphertext: true, iv: true, callType: true, callDuration: true,
      createdAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({ data: { ...message, createdAt: message.createdAt.toISOString() } }, { status: 201 })
}
