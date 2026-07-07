import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

// GET /api/channels/[id]/key — возвращает зашифрованный channelKey для текущего пользователя
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: user.id } },
    select: { channelKey: true },
  })
  if (!member) return NextResponse.json({ data: null, error: 'Not a member' }, { status: 403 })

  return NextResponse.json({ data: { encryptedChannelKey: member.channelKey || null }, error: null })
}
