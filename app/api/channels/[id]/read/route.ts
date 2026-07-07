import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.channelMember.updateMany({
    where: { channelId: id, userId: user.id },
    data: { unreadCount: 0, lastReadAt: new Date() },
  })

  return NextResponse.json({ data: { ok: true } })
}
