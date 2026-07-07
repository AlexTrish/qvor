import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'

// PATCH — принять/отклонить заявку
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = z.object({ status: z.enum(['ACCEPTED', 'DECLINED']) }).parse(await req.json())

  const row = await prisma.friendship.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  if (row.receiverId !== user.id) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.friendship.update({ where: { id }, data: { status } })
  return NextResponse.json({ data: { status: updated.status }, error: null })
}

// DELETE — удалить из друзей / отозвать заявку
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await prisma.friendship.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  if (row.senderId !== user.id && row.receiverId !== user.id) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.friendship.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
