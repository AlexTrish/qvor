import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const REASONS = ['spam', 'harassment', 'illegal_content', 'csam', 'terrorism', 'fraud', 'malware', 'copyright', 'misinformation', 'other'] as const

const schema = z.object({
  targetType: z.enum(['user', 'channel', 'message']),
  targetId: z.string().min(1).max(100),
  reason: z.enum(REASONS),
  comment: z.string().max(1000).optional(),
})

// POST /api/reports — подать жалобу
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'api')
  if (limited) return limited

  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 })

  const { targetType, targetId, reason, comment } = parsed.data

  // Нельзя жаловаться на себя
  if (targetType === 'user' && targetId === user.id) {
    return NextResponse.json({ data: null, error: 'Cannot report yourself' }, { status: 400 })
  }

  try {
    const report = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, comment)
      VALUES (${user.id}::uuid, ${targetType}, ${targetId}, ${reason}, ${comment ?? null})
      ON CONFLICT (reporter_id, target_type, target_id)
        WHERE status IN ('pending', 'reviewing')
      DO NOTHING
      RETURNING id
    `

    if (!report.length) {
      return NextResponse.json({ data: null, error: 'already_reported' }, { status: 409 })
    }

    // Автоматический флаг при 3+ жалобах на одну цель
    const count = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM reports
      WHERE target_type = ${targetType} AND target_id = ${targetId}
        AND status IN ('pending', 'reviewing')
    `
    const reportCount = Number(count[0]?.count ?? 0)

    // При 5+ жалобах — автоматически переводим в 'reviewing'
    if (reportCount >= 5) {
      await prisma.$executeRaw`
        UPDATE reports SET status = 'reviewing'
        WHERE target_type = ${targetType} AND target_id = ${targetId}
          AND status = 'pending'
      `
    }

    return NextResponse.json({ data: { id: report[0].id, reportCount }, error: null }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ data: null, error: 'Internal error' }, { status: 500 })
  }
}
