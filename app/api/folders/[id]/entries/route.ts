import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addSchema = z.object({
  peerId: z.string(),
  peerType: z.enum(['user', 'channel']).default('user'),
})

const pinSchema = z.object({
  peerId: z.string(),
  pinned: z.boolean(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const folder = await prisma.chatFolder.findUnique({ where: { id } })
  if (!folder || folder.userId !== user.id) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  const body = await request.json()

  // Handle pin toggle
  if ('pinned' in body) {
    const parsed = pinSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })
    const entry = await prisma.chatFolderEntry.updateMany({
      where: { folderId: id, peerId: parsed.data.peerId },
      data: { pinned: parsed.data.pinned, pinnedAt: parsed.data.pinned ? new Date() : null },
    })
    return NextResponse.json({ data: entry, error: null })
  }

  // Add chat to folder
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const entry = await prisma.chatFolderEntry.upsert({
    where: { folderId_peerId: { folderId: id, peerId: parsed.data.peerId } },
    create: { folderId: id, userId: user.id, peerId: parsed.data.peerId, peerType: parsed.data.peerType },
    update: {},
  })

  return NextResponse.json({ data: entry, error: null }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const peerId = searchParams.get('peerId')
  if (!peerId) return NextResponse.json({ data: null, error: 'peerId required' }, { status: 400 })

  await prisma.chatFolderEntry.deleteMany({ where: { folderId: id, peerId } })
  return NextResponse.json({ data: { removed: true }, error: null })
}
