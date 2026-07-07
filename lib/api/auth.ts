import { api } from './client'

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<{ sent: boolean; telegramLinked: boolean }>('/api/auth/send-otp', { phone }),

  register: (data: {
    phone: string
    password: string
    passphrase: string
    recoveryHint: string
    otpCode: string
    publicKey: string
    blob: string
    blobRecovery: string
  }) => api.post<{ userId: string }>('/api/auth/register', data),

  login: (phone: string, password: string) =>
    api.post<{ otpSent: boolean }>('/api/auth/login', { phone, password }),

  verifyOtp: (phone: string, otpCode: string) =>
    api.post<{ userId: string; blob: string }>('/api/auth/verify-otp', { phone, otpCode }),

  refresh: () =>
    api.post<{ refreshed: boolean }>('/api/auth/refresh', {}),

  logout: () =>
    api.post<{ loggedOut: boolean }>('/api/auth/logout', {}),

  telegramLink: (phone: string) =>
    api.post<{ deeplink: string; token: string }>('/api/auth/telegram-link', { phone }),

  telegramLogin: (data: {
    id: number
    first_name: string
    auth_date: number
    hash: string
    username?: string
    photo_url?: string
  }) => api.post<{ userId: string; blob: string }>('/api/auth/telegram-login', data),

  recoverVerifyOtp: (phone: string, otpCode: string) =>
    api.post<{ recoveryHint: string }>('/api/auth/recover/verify-otp', { phone, otpCode }),

  recoverVerifyPassphrase: (phone: string, passphrase: string) =>
    api.post<{ valid: boolean }>('/api/auth/recover/verify-passphrase', { phone, passphrase }),

  recoverResetPassword: (phone: string, passphrase: string, newPassword: string, newBlob?: string) =>
    api.post<{ reset: boolean }>('/api/auth/recover/reset-password', { phone, passphrase, newPassword, newBlob }),
}
