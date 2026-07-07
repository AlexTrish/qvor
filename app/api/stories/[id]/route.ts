import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const story = await prisma.story.findUnique({ where: { id } })
  if (!story || story.userId !== user.id) {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  }

  await prisma.story.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
