import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ pinned: z.boolean() })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })
  const { pinned } = parsed.data

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: user.id } },
  })
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  await prisma.channelMember.update({
    where: { channelId_userId: { channelId: id, userId: user.id } },
    data: { pinned, pinnedAt: pinned ? new Date() : null },
  })

  return NextResponse.json({ data: { pinned }, error: null })
}
