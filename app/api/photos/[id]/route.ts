import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const photo = await prisma.photo.findUnique({ where: { id }, select: { userId: true } })
  if (!photo) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  if (photo.userId !== user.id) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  await prisma.photo.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
