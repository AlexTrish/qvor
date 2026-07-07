import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  peerId: z.string(),
  peerType: z.enum(['user', 'channel']).default('user'),
  archived: z.boolean().optional(),
  pinned: z.boolean().optional(),
  unreadCount: z.number().int().min(0).optional(),
  lastReadAt: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const states = await prisma.chatState.findMany({ where: { userId: user.id } })
  return NextResponse.json({ data: states, error: null })
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const { peerId, peerType, ...data } = parsed.data

  const state = await prisma.chatState.upsert({
    where: { userId_peerId: { userId: user.id, peerId } },
    create: {
      userId: user.id, peerId, peerType,
      ...data,
      pinnedAt: data.pinned ? new Date() : undefined,
    },
    update: {
      ...data,
      pinnedAt: data.pinned === true ? new Date() : data.pinned === false ? null : undefined,
    },
  })

  return NextResponse.json({ data: state, error: null })
}
