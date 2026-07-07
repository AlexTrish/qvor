import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.storyView.upsert({
    where: { storyId_userId: { storyId: id, userId: user.id } },
    create: { storyId: id, userId: user.id },
    update: {},
  })

  return NextResponse.json({ data: { viewed: true }, error: null })
}
