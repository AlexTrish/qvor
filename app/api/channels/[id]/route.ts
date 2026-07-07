import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stripHtml } from '@/lib/utils'
import { CHANNEL_CATEGORIES } from '@/app/api/channels/route'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
  type: z.enum(['CHANNEL', 'GROUP']).optional(),
  category: z.enum(CHANNEL_CATEGORIES).optional(),
})

async function getMember(channelId: string, userId: string) {
  return prisma.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await getMember(id, user.id)
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { members: true } },
    },
  })

  if (!channel) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: { ...channel, myRole: member.role }, error: null })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await getMember(id, user.id)
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const channel = await prisma.channel.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.name ? { name: stripHtml(parsed.data.name) } : {}),
      ...(parsed.data.description ? { description: stripHtml(parsed.data.description) } : {}),
    },
  })
  return NextResponse.json({ data: channel, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await getMember(id, user.id)
  if (!member || member.role !== 'OWNER') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.channel.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
