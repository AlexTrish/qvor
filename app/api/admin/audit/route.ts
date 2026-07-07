import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
})

type AuditRow = {
  id: string
  actor_id: string
  actor_name: string | null
  action: string
  target_type: string | null
  target_id: string | null
  meta: string | null
  created_at: Date
}

export async function GET(request: NextRequest) {
  const { error } = await adminAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const { page, limit } = schema.parse({
    page:  searchParams.get('page')  ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID NOT NULL,
        actor_name TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS audit_logs_created_at ON audit_logs(created_at DESC)
    `
  } catch { /* уже существует */ }

  const offset = (page - 1) * limit

  const [rows, countResult] = await Promise.all([
    prisma.$queryRaw<AuditRow[]>`
      SELECT id, actor_id, actor_name, action, target_type, target_id,
             meta::text as meta, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM audit_logs`,
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return NextResponse.json({
    data: rows.map((r: AuditRow) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      meta: r.meta ? JSON.parse(r.meta) : null,
      createdAt: r.created_at.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
