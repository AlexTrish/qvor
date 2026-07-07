import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const roleSchema = z.object({ role: z.enum(['ADMIN', 'MEMBER']) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const me = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
  if (!me || me.role !== 'OWNER') return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = roleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const updated = await prisma.channelMember.update({
    where: { channelId_userId: { channelId: id, userId } },
    data: { role: parsed.data.role },
  })

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id, userId } = await params
  const me = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })

  // Можно выйти самому или кикнуть если OWNER/ADMIN
  const isSelf = userId === user.id
  if (!isSelf && (!me || (me.role !== 'OWNER' && me.role !== 'ADMIN'))) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.channelMember.delete({ where: { channelId_userId: { channelId: id, userId } } })
  return NextResponse.json({ data: { removed: true }, error: null })
}
