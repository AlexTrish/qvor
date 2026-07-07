import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'
import { writeAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  role: z.enum(['USER', 'SUPER_ADMIN']).optional(),
  banned: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin, error } = await adminAuth(request)
  if (error) return error

  const { id } = await params
  if (id === admin!.id) return NextResponse.json({ error: 'Нельзя изменить себя' }, { status: 400 })

  const body = await request.json()
  const data = patchSchema.parse(body)

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
    },
    select: { id: true, role: true, username: true, displayName: true },
  })

  writeAudit(admin!.id, admin!.username ?? null, 'user.role_change', 'user', id, { role: data.role }).catch(() => null)
  return NextResponse.json({ data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin, error } = await adminAuth(request)
  if (error) return error

  const { id } = await params
  if (id === admin!.id) return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  writeAudit(admin!.id, admin!.username ?? null, 'user.delete', 'user', id).catch(() => null)
  return NextResponse.json({ data: { deleted: true } })
}
