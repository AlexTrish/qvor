import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const onlineSchema = z.object({
  isOnline: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isOnline } = onlineSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isOnline },
      select: {
        id: true,
        numericId: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Online status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: false },
      select: {
        id: true,
        numericId: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Online status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}