'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, MessageCircle, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type Props = {
  mode: 'login' | 'register'
  // Для register — вызывается когда бот подтвердил номер нового пользователя
  onRegisterReady?: (phone: string, regToken: string) => void
}

type PollStatus = 'idle' | 'waiting' | 'done' | 'expired'

export function TelegramAuthButton({ mode, onRegisterReady }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [status, setStatus] = useState<PollStatus>('idle')
  const [deeplink, setDeeplink] = useState('')
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenRef = useRef('')

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function handleStart() {
    setError('')
    setStatus('waiting')
    try {
      const res = await fetch('/api/auth/tg-auth', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.unknownError'))
      tokenRef.current = json.data.token
      setDeeplink(json.data.deeplink)

      // Открываем Telegram сразу
      window.open(json.data.deeplink, '_blank')

      // Поллим каждые 2 секунды
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/auth/tg-auth/poll?token=${tokenRef.current}`)
          const pj = await pr.json()
          const data = pj.data
          if (!data) return

          if (data.status === 'expired') {
            stopPolling()
            setStatus('expired')
            return
          }

          if (data.status === 'ready') {
            stopPolling()
            setStatus('done')
            if (data.mode === 'login') {
              // Куки уже выставлены сервером
              router.push('/')
            } else if (data.mode === 'register' && onRegisterReady) {
              onRegisterReady(data.phone as string, data.regToken as string)
            }
          }
        } catch { /* сетевая ошибка — продолжаем поллить */ }
      }, 2000)
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    }
  }

  function handleCancel() {
    stopPolling()
    setStatus('idle')
    setDeeplink('')
    tokenRef.current = ''
  }

  if (status === 'idle' || status === 'expired') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleStart}
          className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-150 hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted]"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[--accent-brand-muted] text-[--accent-brand]">
            <MessageCircle className="size-4" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t('tgAuth.buttonTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('tgAuth.buttonDesc')}</p>
          </div>
          <ExternalLink className="size-4 text-muted-foreground transition-transform duration-150 group-hover:text-[--accent-brand]" strokeWidth={1.5} />
        </button>
        {status === 'expired' && (
          <p className="text-xs text-center text-muted-foreground">{t('tgAuth.expired')}</p>
        )}
        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[--accent-brand]/30 bg-[--accent-brand-muted] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[--accent-brand]">{t('tgAuth.waiting')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('tgAuth.waitingDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {deeplink && (
        <a
          href={deeplink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <MessageCircle className="size-4" strokeWidth={1.5} />
          {t('tgAuth.openBot')}
          <ExternalLink className="size-3.5" strokeWidth={1.5} />
        </a>
      )}
    </div>
  )
}
