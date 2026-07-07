import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const inviteSchema = z.object({
  userId: z.string().uuid(),
  encryptedChannelKey: z.string().optional(), // channelKey зашифрованный publicKey нового участника
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  const members = await prisma.channelMember.findMany({
    where: { channelId: id },
    include: { user: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ data: members, error: null })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: parsed.data.userId } },
  })
  if (existing) return NextResponse.json({ data: null, error: 'Already a member' }, { status: 409 })

  const newMember = await prisma.channelMember.create({
    data: { channelId: id, userId: parsed.data.userId, role: 'MEMBER', channelKey: parsed.data.encryptedChannelKey ?? '' },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  })

  return NextResponse.json({ data: newMember, error: null }, { status: 201 })
}
