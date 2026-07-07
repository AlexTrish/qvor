import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/middleware/auth'
import { broker } from '@/lib/sse/broker'

const schema = z.object({
  toUserId: z.string().uuid(),
  isTyping: z.boolean(),
})

export async function POST(req: NextRequest) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  broker.publish(parsed.data.toUserId, {
    type: 'typ',
    data: { f: user.id, t: parsed.data.toUserId, v: parsed.data.isTyping },
  })

  return NextResponse.json({ ok: true })
}
