import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { auth } from '@/middleware/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await auth(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const member = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: user.id } } })
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const avatarUrl = `data:${file.type};base64,${base64}`

    await prisma.channel.update({ where: { id }, data: { avatarUrl } })

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    logger.error('Upload channel avatar error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
