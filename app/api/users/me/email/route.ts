import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { verifyOtp } from '@/lib/auth/otp'
import { logger } from '@/lib/logger'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const user = await auth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, code } = schema.parse(body)

    const valid = await verifyOtp(`email:${email}`, code)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    })

    logger.info('Email updated', { userId: user.id, email })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Email update error', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await auth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: null },
    })

    logger.info('Email removed', { userId: user.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Email removal error', { error })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
