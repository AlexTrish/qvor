import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { auth } from '@/middleware/auth'

const paramsSchema = z.object({
  id: z.string().regex(/^(?:\d+|\@\w+)$/, 'Invalid user ID or username'),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const viewer = await auth(req).catch(() => null)

    let user

    const SELECT = {
      id: true,
      numericId: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerConfig: true,
      isOnline: true,
      hideOnline: true,
      lastSeenAt: true,
      createdAt: true,
      privacySettings: true,
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (id.startsWith('@')) {
      const username = id.slice(1)
      user = await prisma.user.findUnique({ where: { username }, select: SELECT })
    } else if (UUID_RE.test(id)) {
      user = await prisma.user.findUnique({ where: { id }, select: SELECT })
    } else {
      const numericId = parseInt(id, 10)
      if (isNaN(numericId)) {
        return NextResponse.json({ data: null, error: 'Invalid numeric ID' }, { status: 400 })
      }
      user = await prisma.user.findUnique({ where: { numericId }, select: SELECT })
    }

    if (!user) {
      return NextResponse.json({ data: null, error: 'User not found' }, { status: 404 })
    }

    // Apply privacy settings
    const privacy = (user.privacySettings ?? {}) as Record<string, string>
    const isOwn = viewer?.id === user.id

    // Check if viewer is a contact (follows back)
    let isContact = false
    if (viewer && !isOwn) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: user.id, followingId: viewer.id } },
      })
      isContact = !!follow
    }

    function canSee(setting: string): boolean {
      if (isOwn) return true
      const val = privacy[setting] ?? 'everyone'
      if (val === 'everyone') return true
      if (val === 'contacts') return isContact
      return false // nobody
    }

    return NextResponse.json({
      data: {
        ...user,
        isOnline: user.hideOnline ? false : user.isOnline,
        lastSeenAt: (user.hideOnline || !canSee('whoCanSeeLastSeen')) ? null : (user.lastSeenAt?.toISOString() ?? null),
        bio: canSee('whoCanSeeBio') ? user.bio : null,
        hideOnline: undefined,
        privacySettings: undefined,
        createdAt: user.createdAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    logger.error('Get user profile error:', { error })
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}