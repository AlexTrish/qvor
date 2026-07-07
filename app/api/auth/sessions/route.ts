import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'

type Session = { id: string; device: string; ip: string | null; lastActiveAt: Date; createdAt: Date }

// GET — список активных сессий пользователя
export async function GET(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  try {
    const sessions = await prisma.$queryRaw<Session[]>`
      SELECT id, device, ip, last_active_at AS "lastActiveAt", created_at AS "createdAt"
      FROM user_sessions
      WHERE user_id = ${user.id}
      ORDER BY last_active_at DESC
    `
    return NextResponse.json({ data: sessions, error: null })
  } catch {
    // Таблица ещё не создана
    return NextResponse.json({ data: [], error: null })
  }
}

// DELETE /api/auth/sessions/[id] — завершить конкретную сессию
// DELETE /api/auth/sessions?all=1 — завершить все кроме текущей
export async function DELETE(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const all = req.nextUrl.searchParams.get('all') === '1'
  const sessionId = req.nextUrl.searchParams.get('id')

  try {
    if (all) {
      // Получаем текущий refresh_token из cookie
      const currentToken = req.cookies.get('refresh_token')?.value
      if (currentToken) {
        const { createHash } = await import('crypto')
        const hash = createHash('sha256').update(currentToken).digest('hex')
        await prisma.$executeRaw`
          DELETE FROM user_sessions
          WHERE user_id = ${user.id} AND refresh_token_hash != ${hash}
        `
      } else {
        await prisma.$executeRaw`DELETE FROM user_sessions WHERE user_id = ${user.id}`
      }
    } else if (sessionId) {
      await prisma.$executeRaw`
        DELETE FROM user_sessions WHERE id = ${sessionId}::uuid AND user_id = ${user.id}
      `
    }
    return NextResponse.json({ data: { ok: true }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Internal error' }, { status: 500 })
  }
}
