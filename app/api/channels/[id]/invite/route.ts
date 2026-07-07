import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// POST /api/channels/[id]/invite — generate invite link (OWNER/ADMIN only)
export async function POST(req: NextRequest, { params }: Params) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: user.id } },
  })
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  // Store invite token in TempStore with 7-day TTL
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.tempStore.upsert({
    where: { key: `invite:${id}` },
    update: { value: token, expiresAt },
    create: { key: `invite:${id}`, value: token, expiresAt },
  })

  return NextResponse.json({ data: { token, expiresAt: expiresAt.toISOString() }, error: null })
}

// GET /api/channels/[id]/invite?token=... — join via invite link
export async function GET(req: NextRequest, { params }: Params) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ data: null, error: 'Missing token' }, { status: 400 })

  const stored = await prisma.tempStore.findUnique({ where: { key: `invite:${id}` } })
  if (!stored || stored.value !== token || stored.expiresAt < new Date()) {
    return NextResponse.json({ data: null, error: 'Invalid or expired invite link' }, { status: 400 })
  }

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  })
  if (!channel) return NextResponse.json({ data: null, error: 'Channel not found' }, { status: 404 })

  // Already a member?
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: user.id } },
  })
  if (existing) {
    return NextResponse.json({ data: { channel, alreadyMember: true }, error: null })
  }

  await prisma.channelMember.create({
    data: { channelId: id, userId: user.id, role: 'MEMBER', channelKey: '' },
  })

  return NextResponse.json({ data: { channel, alreadyMember: false }, error: null })
}
