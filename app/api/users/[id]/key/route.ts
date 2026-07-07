import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/middleware/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await auth(req)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const target = await prisma.user.findFirst({
    where: {
      OR: [
        { id },
        { numericId: isNaN(Number(id)) ? undefined : Number(id) },
        { username: id.startsWith('@') ? id.slice(1) : id },
      ],
    },
    select: { id: true, publicKey: true },
  })

  if (!target || !target.publicKey) {
    return NextResponse.json({ data: null, error: 'Key not found' }, { status: 404 })
  }

  return NextResponse.json({ data: { publicKey: target.publicKey }, error: null })
}
