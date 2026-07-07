'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authApi } from '@/lib/api'

type AuthStep = 'phone' | 'otp' | 'done'

type AuthUser = {
  id: string
  blob: string
  role?: string
  username?: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  bannerConfig?: string | null
  birthDate?: string | null
  numericId?: number
  phoneHash?: string
  telegramId?: string
  recoveryHint?: string
  email?: string | null
  createdAt?: string
  isOnline?: boolean
  hideOnline?: boolean
  privacySettings?: Record<string, string> | null
  lastSeenAt?: string | null
}

type UseAuthReturn = {
  step: AuthStep
  phone: string
  user: AuthUser | null
  isLoading: boolean
  isAuthChecking: boolean
  error: string | null
  login: (phone: string, password: string) => Promise<void>
  verifyOtp: (code: string) => Promise<void>
  goBack: () => void
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  unlockKeys: (blob: string, password: string, userId: string) => Promise<void>
}

// Тихий рефреш токена — не трогает состояние, просто обновляет куки
async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    return res.ok
  } catch {
    return false
  }
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const pathname = usePathname()
  const AUTH_PATHS = new Set(['/login', '/register', '/recover'])
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Запускаем авто-рефреш каждые 10 минут (access_token живёт 15 мин)
  function startAutoRefresh() {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(async () => {
      const ok = await silentRefresh()
      if (!ok) {
        stopAutoRefresh()
        setUser(null)
        setStep('phone')
        router.push('/login')
      }
    }, 10 * 60 * 1000)
  }

  function stopAutoRefresh() {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  // Проверяем сессию при монтировании
  useEffect(() => {
    // На auth страницах не проверяем сессию
    if (AUTH_PATHS.has(pathname)) {
      setIsAuthChecking(false)
      return
    }
    async function checkSession() {
      try {
        let res = await fetch('/api/users/me', { credentials: 'include' })

        if (res.status === 401) {
          const ok = await silentRefresh()
          if (ok) res = await fetch('/api/users/me', { credentials: 'include' })
        }

        if (res.ok) {
          const json = await res.json()
          if (json.data) {
            setUser(json.data)
            setStep('done')
            startAutoRefresh()
            return
          }
        }
        // Сессия невалидна — редиректим на /login
        if (!AUTH_PATHS.has(pathname)) router.replace('/login')
      } catch {}
      finally {
        setIsAuthChecking(false)
      }
    }
    checkSession()

    return () => stopAutoRefresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(phoneNumber: string, password: string): Promise<void> {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authApi.login(phoneNumber, password)
      if (res.error) throw new Error(res.error)
      setPhone(phoneNumber)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyOtp(code: string): Promise<void> {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authApi.verifyOtp(phone, code)
      if (res.error || !res.data) throw new Error(res.error ?? 'Неизвестная ошибка')
      setUser({ id: res.data.userId, blob: res.data.blob })
      setStep('done')
      startAutoRefresh()

      // Расшифровываем blob и сохраняем privateKey в IndexedDB
      // blob расшифровывается позже через unlockWithPassword после ввода пароля
      // Здесь просто сохраняем blob для последующей разблокировки

      router.push('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  function goBack(): void {
    setError(null)
    setStep('phone')
  }

  async function refreshUser(): Promise<void> {
    try {
      let res = await fetch('/api/users/me', { credentials: 'include' })
      if (res.status === 401) {
        const ok = await silentRefresh()
        if (ok) res = await fetch('/api/users/me', { credentials: 'include' })
        else return // refresh_token истёк, но не редиректим — пусть пользователь сам решит
      }
      if (res.ok) {
        const json = await res.json()
        if (json.data) setUser(json.data)
      }
    } catch {}
  }

  async function logout(): Promise<void> {
    stopAutoRefresh()
    await authApi.logout()
    setUser(null)
    setStep('phone')
    // Очищаем сохранённые аккаунты из localStorage
    try { localStorage.removeItem('qvor_accounts') } catch {}
    router.push('/login')
  }

  async function deleteAccount(): Promise<void> {
    stopAutoRefresh()
    await fetch('/api/users/me/delete', { method: 'DELETE', credentials: 'include' })
    setUser(null)
    setStep('phone')
    try { localStorage.removeItem('qvor_accounts') } catch {}
    router.push('/login')
  }

  // Расшифровываем blob паролем и сохраняем privateKey в IndexedDB
  async function unlockKeys(blob: string, password: string, userId: string): Promise<void> {
    try {
      const { decryptBlob, storePrivateKey } = await import('@/lib/crypto/e2e')
      const privateKey = await decryptBlob(blob, password)
      await storePrivateKey(userId, privateKey)
    } catch {
      // Неверный пароль или повреждённый blob — не критично, чат будет работать без шифрования
    }
  }

  return { step, phone, user, isLoading, isAuthChecking, error, login, verifyOtp, goBack, refreshUser, logout, deleteAccount, unlockKeys }
}
