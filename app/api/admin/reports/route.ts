import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminAuth } from '@/middleware/adminAuth'
import { z } from 'zod'
import { writeAudit } from '@/lib/audit'

type Report = {
  id: string
  reporter_id: string
  reporter_name: string | null
  reporter_username: string | null
  target_type: string
  target_id: string
  reason: string
  comment: string | null
  status: string
  moderator_id: string | null
  moderator_note: string | null
  action_taken: string | null
  created_at: Date
  reviewed_at: Date | null
  resolved_at: Date | null
  report_count: bigint
}

const resolveSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['resolved', 'dismissed']),
  moderatorNote: z.string().max(500).optional(),
  actionTaken: z.enum(['warned', 'banned', 'deleted', 'none']).optional(),
})

// GET /api/admin/reports — список жалоб с фильтрацией
export async function GET(req: NextRequest) {
  const { user: admin, error: authErr } = await adminAuth(req)
  if (!admin) return authErr!

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'pending'
  const targetType = searchParams.get('targetType')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    const whereStatus = status === 'all' ? `status IN ('pending', 'reviewing', 'resolved', 'dismissed')` : `status = '${status}'`
    const whereType = targetType ? `AND target_type = '${targetType}'` : ''

    const reports = (await prisma.$queryRawUnsafe(`
      SELECT
        r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.comment,
        r.status, r.moderator_id, r.moderator_note, r.action_taken,
        r.created_at, r.reviewed_at, r.resolved_at,
        u.display_name AS reporter_name, u.username AS reporter_username,
        (SELECT COUNT(*) FROM reports r2
         WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id
           AND r2.status IN ('pending', 'reviewing')) AS report_count
      FROM reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      WHERE ${whereStatus} ${whereType}
      ORDER BY
        CASE WHEN r.status = 'reviewing' THEN 0 ELSE 1 END,
        r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)) as Report[]

    const totalRows = (await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM reports WHERE ${whereStatus} ${whereType}
    `)) as { count: bigint }[]

    return NextResponse.json({
      data: reports.map((r: Report) => ({ ...r, report_count: Number(r.report_count) })),
      total: Number(totalRows[0]?.count ?? 0),
      pages: Math.ceil(Number(totalRows[0]?.count ?? 0) / limit),
      error: null,
    })
  } catch {
    return NextResponse.json({ data: [], total: 0, pages: 0, error: null })
  }
}

// PATCH /api/admin/reports — принять решение по жалобе
export async function PATCH(req: NextRequest) {
  const { user: admin, error: authErr } = await adminAuth(req)
  if (!admin) return authErr!

  const body = await req.json()
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const { reportId, status, moderatorNote, actionTaken } = parsed.data

  try {
    // Получаем жалобу
    const reports = await prisma.$queryRaw<{ target_type: string; target_id: string }[]>`SELECT target_type, target_id FROM reports WHERE id = ${reportId}::uuid`
    if (!reports.length) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    const report = reports[0]

    // Обновляем статус
    await prisma.$executeRaw`
      UPDATE reports SET
        status = ${status},
        moderator_id = ${admin.id}::uuid,
        moderator_note = ${moderatorNote ?? null},
        action_taken = ${actionTaken ?? 'none'},
        reviewed_at = NOW(),
        resolved_at = NOW()
      WHERE id = ${reportId}::uuid
    `

    // Применяем действие
    if (actionTaken === 'banned' && report.target_type === 'user') {
      await prisma.$executeRaw`
        UPDATE users SET banned_at = NOW() WHERE id = ${report.target_id}::uuid
      `
    }
    if (actionTaken === 'deleted' && report.target_type === 'channel') {
      await prisma.channel.delete({ where: { id: report.target_id } }).catch(() => null)
    }
    if (actionTaken === 'deleted' && report.target_type === 'message') {
      await prisma.message.update({
        where: { id: report.target_id },
        data: { deletedAt: new Date() },
      }).catch(() => null)
    }

    await writeAudit(admin.id, admin.username ?? 'admin', `report.${status}`, report.target_type, report.target_id, { actionTaken, reportId })

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Internal error' }, { status: 500 })
  }
}
