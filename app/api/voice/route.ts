import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { prisma } from '@/lib/prisma'
import { broker } from '@/lib/sse/broker'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
// Принимаем любой audio/* тип — браузеры записывают в разных форматах
function isAudioType(type: string): boolean {
  return type.startsWith('audio/') || type === 'video/webm' || type === 'video/mp4'
}
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'messages')
  if (limited) return limited

  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('audio') as File | null
  const receiverId = formData.get('receiverId') as string | null
  const duration = parseInt(formData.get('duration') as string ?? '0', 10)

  if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  if (!receiverId) return NextResponse.json({ error: 'receiverId required' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  if (!isAudioType(file.type)) return NextResponse.json({ error: 'Invalid audio type' }, { status: 400 })

  // Проверяем получателя
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } })
  if (!receiver) return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })

  // Определяем расширение по MIME-типу
  const ext = file.type.includes('ogg') ? 'ogg'
    : file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a'
    : file.type.includes('mpeg') || file.type.includes('mp3') ? 'mp3'
    : file.type.includes('wav') ? 'wav'
    : 'webm'
  const filename = `${randomUUID()}.${ext}`
  const dir = join(process.cwd(), 'public', 'voice')
  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(dir, filename), buffer)

  const voiceUrl = `/api/voice/${filename}`

  // Создаём сообщение в БД
  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId,
      ciphertext: '[voice]',
      iv: 'voice',
      voiceUrl,
      voiceDuration: isNaN(duration) ? 0 : Math.min(duration, 3600),
    },
    select: {
      id: true, senderId: true, receiverId: true,
      ciphertext: true, iv: true, voiceUrl: true, voiceDuration: true,
      createdAt: true,
      sender: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
      receiver: { select: { id: true, numericId: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  const msgData = {
    ...message,
    createdAt: message.createdAt.toISOString(),
  }

  // SSE push получателю
  broker.publish(receiverId, { type: 'msg', data: msgData as Record<string, unknown> })

  // Инкремент unread
  await prisma.chatState.upsert({
    where: { userId_peerId: { userId: receiverId, peerId: user.id } },
    create: { userId: receiverId, peerId: user.id, peerType: 'user', unreadCount: 1 },
    update: { unreadCount: { increment: 1 } },
  })

  return NextResponse.json({ data: msgData }, { status: 201 })
}
