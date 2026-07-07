import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; emoji: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id, emoji } = await params
  await prisma.reaction.deleteMany({
    where: { messageId: id, userId: user.id, emoji: decodeURIComponent(emoji) },
  })

  return NextResponse.json({ data: { removed: true }, error: null })
}
