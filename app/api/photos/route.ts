import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/utils'

const postSchema = z.object({
  dataUrl: z.string().min(10).max(10 * 1024 * 1024), // ~10MB base64 (без обрезки — оригинал)
  caption: z.string().max(500).default(''),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ data: null, error: 'userId required' }, { status: 400 })

  const photos = await prisma.photo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, dataUrl: true, caption: true, createdAt: true },
  })

  return NextResponse.json({
    data: photos.map((p: typeof photos[number]) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    error: null,
  })
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'api')
  if (limited) return limited

  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })

  const photo = await prisma.photo.create({
    data: {
      userId: user.id,
      dataUrl: parsed.data.dataUrl,
      caption: stripHtml(parsed.data.caption),
    },
    select: { id: true, dataUrl: true, caption: true, createdAt: true },
  })

  return NextResponse.json({
    data: { ...photo, createdAt: photo.createdAt.toISOString() },
    error: null,
  }, { status: 201 })
}
