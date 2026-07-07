import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/middleware/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { error } = await adminAuth(request)
  if (error) return error

  const [users, messages, channels, onlineUsers] = await Promise.all([
    prisma.user.count(),
    prisma.message.count({ where: { deletedAt: null } }),
    prisma.channel.count(),
    prisma.user.count({ where: { isOnline: true } }),
  ])

  const newUsersToday = await prisma.user.count({
    where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })

  const newMessagesToday = await prisma.message.count({
    where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null },
  })

  return NextResponse.json({ data: { users, messages, channels, onlineUsers, newUsersToday, newMessagesToday } })
}
