'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { ShieldCheck, XCircle } from 'lucide-react'

type Status = 'loading' | 'confirm' | 'transferring' | 'done' | 'error'

export default function DeviceLinkScanPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>('loading')
  const [ephemeralPublicKey, setEphemeralPublicKey] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    // Загружаем ephemeral публичный ключ нового устройства
    fetch(`/api/auth/device-link?token=${token}`)
      .then(r => r.json())
      .then(j => {
        if (j.data?.status === 'pending' && j.data.ephemeralPublicKey) {
          setEphemeralPublicKey(j.data.ephemeralPublicKey)
          setStatus('confirm')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  async function handleTransfer() {
    if (!user?.id || !ephemeralPublicKey) return
    setStatus('transferring')
    try {
      // Загружаем свой privateKey из IndexedDB
      const { loadPrivateKey, encryptPrivateKeyForDevice } = await import('@/lib/crypto/e2e')
      const privateKey = await loadPrivateKey(user.id)
      if (!privateKey) { setStatus('error'); return }

      // Шифруем ephemeral публичным ключом нового устройства
      const encryptedPrivateKey = await encryptPrivateKeyForDevice(privateKey, ephemeralPublicKey)

      // Передаём на сервер
      const res = await fetch('/api/auth/device-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer', token, encryptedPrivateKey }),
      })
      if (!res.ok) { setStatus('error'); return }

      setStatus('done')
      setTimeout(() => router.push('/'), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[--accent-brand-muted]">
            <ShieldCheck className="size-8 text-[--accent-brand]" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
            {t('deviceLink.scanTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('deviceLink.scanSubtitle')}</p>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
          </div>
        )}

        {status === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 text-left space-y-2">
              <p className="text-sm font-semibold">{t('deviceLink.confirmTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('deviceLink.confirmDesc')}</p>
            </div>
            <button type="button" onClick={handleTransfer}
              className="btn-accent w-full h-11 rounded-xl font-semibold transition-all active:scale-[0.97]">
              {t('deviceLink.confirmBtn')}
            </button>
            <button type="button" onClick={() => router.push('/')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        )}

        {status === 'transferring' && (
          <div className="flex flex-col items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
            <p className="text-sm text-muted-foreground">{t('deviceLink.transferring')}</p>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck className="size-12 text-green-500" strokeWidth={1.5} />
            <p className="text-sm font-medium text-green-600">{t('deviceLink.transferDone')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="size-12 text-destructive" strokeWidth={1.5} />
            <p className="text-sm text-destructive">{t('common.error')}</p>
            <button type="button" onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground">
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
