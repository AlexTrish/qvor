import { z } from 'zod'

const phoneSchema = z.string().regex(/^\+?\d{7,15}$/, 'Некорректный номер телефона')

export const sendOtpSchema = z.object({
  phone: phoneSchema,
})

export const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, 'Минимум 8 символов'),
  passphrase: z.string().min(1, 'Слово не может быть пустым'),
  recoveryHint: z.string().min(3, 'Минимум 3 символа'),
  publicKey: z.string().min(1),
  blob: z.string().min(1),
  blobRecovery: z.string().min(1),
  otpCode: z.string().length(6).optional(),
  regToken: z.string().optional(),
  telegramId: z.string().optional(),
}).refine(d => d.otpCode || d.regToken, { message: 'Требуется otpCode или regToken' })

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
})

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otpCode: z.string().length(6),
})

export const recoverSchema = z.object({
  phone: phoneSchema,
  passphrase: z.string().min(1),
  newPassword: z.string().min(8),
  newBlob: z.string().min(1),
  otpCode: z.string().length(6),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type RecoverInput = z.infer<typeof recoverSchema>
