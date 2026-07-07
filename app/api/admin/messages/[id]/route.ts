import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await adminAuth(request)
  if (error) return error

  const { id } = await params
  await prisma.message.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}
