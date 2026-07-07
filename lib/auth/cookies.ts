import 'server-only'
import { cookies } from 'next/headers'

const IS_PROD = process.env.NODE_ENV === 'production'

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies()

  store.set('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 минут
  })

  store.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  })
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies()
  store.delete('access_token')
  store.delete('refresh_token')
}
