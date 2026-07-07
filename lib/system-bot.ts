import 'server-only'
import { prisma } from '@/lib/prisma'
import { broker } from '@/lib/sse/broker'
import { logger } from '@/lib/logger'

// Фиксированный UUID системного пользователя (совпадает с миграцией)
export const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Отправляет plaintext сообщение от @qvor пользователю.
 * Используется для OTP кодов, системных уведомлений, новостей.
 */
export async function sendBotMessage(
  toUserId: string,
  text: string,
): Promise<string> {
  const message = await prisma.message.create({
    data: {
      senderId:   SYSTEM_BOT_ID,
      receiverId: toUserId,
      ciphertext: text,
      iv:         `plain-bot-${Date.now()}`,
    },
  })

  // SSE push — сообщение появляется мгновенно без перезагрузки
  broker.publish(toUserId, {
    type: 'msg',
    data: {
      id:         message.id,
      senderId:   SYSTEM_BOT_ID,
      receiverId: toUserId,
      ciphertext: text,
      iv:         message.iv,
      createdAt:  message.createdAt.toISOString(),
      sender: {
        id:          SYSTEM_BOT_ID,
        username:    'qvor',
        displayName: 'QVOR',
        avatarUrl:   null,
        numericId:   100000,
      },
    },
  })

  // Инкрементируем unread счётчик получателя
  await prisma.chatState.upsert({
    where:  { userId_peerId: { userId: toUserId, peerId: SYSTEM_BOT_ID } },
    update: { unreadCount: { increment: 1 }, updatedAt: new Date() },
    create: {
      userId:      toUserId,
      peerId:      SYSTEM_BOT_ID,
      peerType:    'user',
      unreadCount: 1,
    },
  })

  logger.info('Bot message sent', { toUserId, preview: text.slice(0, 30) })
  return message.id
}

/**
 * Рассылка всем пользователям или одному.
 * Используется из админки для новостей/объявлений.
 */
export async function broadcastBotMessage(
  text: string,
  options: { userId?: string } = {},
): Promise<{ sent: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: {
      ...(options.userId ? { id: options.userId } : {}),
      // Не отправляем самому боту
      NOT: { id: SYSTEM_BOT_ID },
    },
    select: { id: true },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      await sendBotMessage(user.id, text)
      sent++
    } catch (err) {
      failed++
      logger.error('Broadcast failed for user', { userId: user.id, error: String(err) })
    }
  }

  logger.info('Broadcast complete', { sent, failed, total: users.length })
  return { sent, failed }
}
