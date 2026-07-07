import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ emoji: z.string().min(1).max(10) })

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const reactions = await prisma.reaction.findMany({
    where: { messageId: id },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  })

  // Group by emoji
  const grouped: Record<string, { emoji: string; count: number; users: string[]; mine: boolean }> = {}
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], mine: false }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user.displayName || r.user.username || r.userId)
    if (r.userId === user.id) grouped[r.emoji].mine = true
  }

  return NextResponse.json({ data: Object.values(grouped), error: null })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const reaction = await prisma.reaction.upsert({
    where: { messageId_userId_emoji: { messageId: id, userId: user.id, emoji: parsed.data.emoji } },
    create: { messageId: id, userId: user.id, emoji: parsed.data.emoji },
    update: {},
  })

  // Notify message sender
  const message = await prisma.message.findUnique({
    where: { id },
    select: { senderId: true, sender: { select: { displayName: true, username: true } } },
  })
  if (message && message.senderId !== user.id) {
    const reactor = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, username: true },
    })
    const reactorName = reactor?.displayName || reactor?.username || 'Пользователь'
    await prisma.notification.create({
      data: {
        userId: message.senderId,
        type: 'reaction',
        title: `${reactorName} поставил ${parsed.data.emoji} на ваше сообщение`,
        data: { messageId: id, emoji: parsed.data.emoji, reactorId: user.id },
      },
    }).catch(() => null)
  }

  return NextResponse.json({ data: reaction, error: null }, { status: 201 })
}
