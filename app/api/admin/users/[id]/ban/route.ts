import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'
import { writeAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin, error } = await adminAuth(request)
  if (error) return error

  const { id } = await params
  if (id === admin!.id) return NextResponse.json({ error: 'Нельзя забанить себя' }, { status: 400 })

  try {
    await prisma.$executeRaw`UPDATE users SET banned_at = NOW() WHERE id = ${id}`
  } catch {
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`
    await prisma.$executeRaw`UPDATE users SET banned_at = NOW() WHERE id = ${id}`
  }

  writeAudit(admin!.id, admin!.username ?? null, 'user.ban', 'user', id).catch(() => null)
  return NextResponse.json({ data: { banned: true } })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin, error } = await adminAuth(request)
  if (error) return error

  const { id } = await params

  try {
    await prisma.$executeRaw`UPDATE users SET banned_at = NULL WHERE id = ${id}`
  } catch { /* колонки нет */ }

  writeAudit(admin!.id, admin!.username ?? null, 'user.unban', 'user', id).catch(() => null)
  return NextResponse.json({ data: { banned: false } })
}
