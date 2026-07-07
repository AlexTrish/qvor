import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { broadcastBotMessage } from '@/lib/system-bot'
import { writeAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  title:  z.string().min(1).max(200),
  body:   z.string().max(4000).optional(),
  userId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const { user: admin, error } = await adminAuth(request)
  if (error) return error

  const body = await request.json()
  const { title, body: msgBody, userId } = schema.parse(body)

  // Формируем текст сообщения
  const text = msgBody ? `📢 ${title}\n\n${msgBody}` : `📢 ${title}`

  const result = await broadcastBotMessage(text, { userId })

  writeAudit(
    admin!.id,
    admin!.username ?? null,
    'broadcast.send',
    userId ? 'user' : 'all',
    userId,
    { title, sent: result.sent, failed: result.failed },
  ).catch(() => null)

  return NextResponse.json({ data: { sent: result.sent, failed: result.failed } })
}
