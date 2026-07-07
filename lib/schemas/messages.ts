import { z } from 'zod'

export const sendMessageSchema = z.object({
  receiverId: z.string().uuid('Некорректный ID получателя'),
  ciphertext: z.string().min(1, 'Шифротекст обязателен'),
  iv: z.string().min(1, 'IV обязателен'),
  replyToId: z.string().uuid().optional().nullable(),
  forwardFrom: z.object({
    userId: z.string(),
    displayName: z.string().nullable(),
    username: z.string().nullable(),
  }).optional().nullable(),
  mentions: z.array(z.string()).max(20).optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(['image', 'video', 'file']).optional().nullable(),
  mediaName: z.string().max(255).optional().nullable(),
  mediaSize: z.number().int().optional().nullable(),
})

export const editMessageSchema = z.object({
  ciphertext: z.string().min(1, 'Шифротекст обязателен'),
  iv: z.string().min(1, 'IV обязателен'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type EditMessageInput = z.infer<typeof editMessageSchema>