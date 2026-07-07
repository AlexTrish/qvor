import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== user.id) {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } })
  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification || notification.userId !== user.id) {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  }

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
