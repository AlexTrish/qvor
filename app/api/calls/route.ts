import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { broker } from '@/lib/sse/broker'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('offer'),        to: z.string().uuid(), callId: z.string().min(1).max(64), sdp: z.string().min(1), video: z.boolean() }),
  z.object({ type: z.literal('offer_update'), to: z.string().uuid(), callId: z.string().min(1).max(64), sdp: z.string().min(1) }),
  z.object({ type: z.literal('answer'),       to: z.string().uuid(), callId: z.string().min(1).max(64), sdp: z.string().min(1) }),
  z.object({ type: z.literal('ice'),          to: z.string().uuid(), callId: z.string().min(1).max(64), candidate: z.string().min(1) }),
  z.object({ type: z.literal('end'),          to: z.string().uuid(), callId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('reject'),       to: z.string().uuid(), callId: z.string().min(1).max(64) }),
  // Групповые звонки
  z.object({ type: z.literal('join'),         channelId: z.string().uuid(), callId: z.string().min(1).max(64), video: z.boolean() }),
  z.object({ type: z.literal('leave'),        channelId: z.string().uuid(), callId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('offer_group'),  to: z.string().uuid(), callId: z.string().min(1).max(64), sdp: z.string().min(1), video: z.boolean() }),
])

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const data = parsed.data

  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { displayName: true, username: true, numericId: true, avatarUrl: true },
  })
  const fromName = sender?.displayName || sender?.username || `User ${sender?.numericId}`
  const fromAvatar = sender?.avatarUrl ?? null

  switch (data.type) {
    case 'offer': {
      const receiver = await prisma.user.findUnique({ where: { id: data.to }, select: { id: true } })
      if (!receiver) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      broker.publish(data.to, { type: 'call_offer', data: { from: user.id, fromName, fromAvatar, callId: data.callId, sdp: data.sdp, video: data.video } })
      break
    }
    case 'offer_update':
      broker.publish(data.to, { type: 'call_offer_update', data: { from: user.id, callId: data.callId, sdp: data.sdp } })
      break
    case 'answer':
      broker.publish(data.to, { type: 'call_answer', data: { from: user.id, callId: data.callId, sdp: data.sdp } })
      break
    case 'ice':
      broker.publish(data.to, { type: 'call_ice', data: { from: user.id, callId: data.callId, candidate: data.candidate } })
      break
    case 'end':
      broker.publish(data.to, { type: 'call_end', data: { from: user.id, callId: data.callId } })
      break
    case 'reject':
      broker.publish(data.to, { type: 'call_reject', data: { from: user.id, callId: data.callId } })
      break

    // ─── Групповые звонки ─────────────────────────────────────────────────
    case 'join': {
      // Уведомляем всех участников канала что кто-то присоединился
      const members = await prisma.channelMember.findMany({
        where: { channelId: data.channelId },
        select: { userId: true },
      })
      members
        .filter((m: { userId: string }) => m.userId !== user.id)
        .forEach((m: { userId: string }) => broker.publish(m.userId, {
          type: 'call_join',
          data: { from: user.id, fromName, fromAvatar, callId: data.callId },
        }))
      break
    }
    case 'leave': {
      const members = await prisma.channelMember.findMany({
        where: { channelId: data.channelId },
        select: { userId: true },
      })
      members
        .filter((m: { userId: string }) => m.userId !== user.id)
        .forEach((m: { userId: string }) => broker.publish(m.userId, {
          type: 'call_leave',
          data: { from: user.id, callId: data.callId },
        }))
      break
    }
    case 'offer_group': {
      // P2P offer конкретному участнику группового звонка
      broker.publish(data.to, { type: 'call_offer', data: { from: user.id, fromName, fromAvatar, callId: data.callId, sdp: data.sdp, video: data.video } })
      break
    }
  }

  return NextResponse.json({ data: { ok: true } })
}
