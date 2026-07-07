import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { stripHtml } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().max(4).optional(),
  position: z.number().int().optional(),
  filterUnread: z.boolean().optional(),
  filterChannels: z.boolean().optional(),
  filterContacts: z.boolean().optional(),
  filterGroups: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const folders = await prisma.chatFolder.findMany({
    where: { userId: user.id },
    include: { chats: true },
    orderBy: { position: 'asc' },
  })

  return NextResponse.json({ data: folders, error: null })
}

export async function POST(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  // Auto position at end
  const count = await prisma.chatFolder.count({ where: { userId: user.id } })

  const folder = await prisma.chatFolder.create({
    data: { userId: user.id, position: count, ...parsed.data, name: stripHtml(parsed.data.name) },
    include: { chats: true },
  })

  return NextResponse.json({ data: folder, error: null }, { status: 201 })
}
