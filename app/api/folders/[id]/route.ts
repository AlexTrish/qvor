import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().max(4).nullable().optional(),
  position: z.number().int().optional(),
  filterUnread: z.boolean().optional(),
  filterChannels: z.boolean().optional(),
  filterContacts: z.boolean().optional(),
  filterGroups: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const folder = await prisma.chatFolder.findUnique({ where: { id } })
  if (!folder || folder.userId !== user.id) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const updated = await prisma.chatFolder.update({ where: { id }, data: parsed.data, include: { chats: true } })
  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const folder = await prisma.chatFolder.findUnique({ where: { id } })
  if (!folder || folder.userId !== user.id) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  await prisma.chatFolder.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
