'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { Smartphone, CheckCircle, XCircle } from 'lucide-react'

type Status = 'generating' | 'waiting' | 'done' | 'expired' | 'error'

export default function DeviceLinkPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('generating')
  const [qrUrl, setQrUrl] = useState('')
  const tokenRef = useRef('')
  const ephemeralPrivateRef = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    init()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function init() {
    try {
      // Генерируем ephemeral ключевую пару
      const { x25519 } = await import('@noble/curves/ed25519')
      const privBytes = x25519.utils.randomPrivateKey()
      const pubBytes = x25519.getPublicKey(privBytes)
      const toHex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('')
      const ephemeralPrivate = toHex(privBytes)
      const ephemeralPublic = toHex(pubBytes)
      ephemeralPrivateRef.current = ephemeralPrivate

      // Регистрируем на сервере
      const res = await fetch('/api/auth/device-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', ephemeralPublicKey: ephemeralPublic }),
      })
      const json = await res.json()
      if (!res.ok || !json.data?.token) { setStatus('error'); return }

      const token = json.data.token
      tokenRef.current = token

      // Генерируем QR через публичный API
      const appUrl = window.location.origin
      const linkUrl = `${appUrl}/device-link/scan?token=${token}`
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkUrl)}`)
      setStatus('waiting')

      // Поллим каждые 2 секунды
      pollRef.current = setInterval(async () => {
        const pr = await fetch(`/api/auth/device-link?token=${token}`)
        const pj = await pr.json()
        const data = pj.data
        if (!data) return

        if (data.status === 'expired') {
          clearInterval(pollRef.current!)
          setStatus('expired')
          return
        }

        if (data.status === 'ready') {
          clearInterval(pollRef.current!)
          // Расшифровываем privateKey
          try {
            const { decryptPrivateKeyFromDevice, storePrivateKey } = await import('@/lib/crypto/e2e')
            const privateKey = await decryptPrivateKeyFromDevice(data.encryptedPrivateKey, ephemeralPrivateRef.current)
            await storePrivateKey(data.userId, privateKey)
            setStatus('done')
            setTimeout(() => router.push('/'), 2000)
          } catch {
            setStatus('error')
          }
        }
      }, 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[--accent-brand-muted]">
            <Smartphone className="size-8 text-[--accent-brand]" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
            {t('deviceLink.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('deviceLink.subtitle')}</p>
        </div>

        {status === 'generating' && (
          <div className="flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
          </div>
        )}

        {status === 'waiting' && qrUrl && (
          <div className="space-y-4">
            <div className="mx-auto w-fit rounded-2xl border border-border bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR code" width={200} height={200} className="rounded-xl" />
            </div>
            <div className="rounded-2xl border border-[--accent-brand]/30 bg-[--accent-brand-muted] p-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                <p className="text-sm font-medium text-[--accent-brand]">{t('deviceLink.waiting')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t('deviceLink.waitingDesc')}</p>
            </div>
            <div className="space-y-2 text-left">
              {[t('deviceLink.step1'), t('deviceLink.step2'), t('deviceLink.step3')].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted] text-[10px] font-bold text-[--accent-brand]">{i + 1}</div>
                  <p className="text-xs text-muted-foreground pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="size-12 text-green-500" strokeWidth={1.5} />
            <p className="text-sm font-medium text-green-600">{t('deviceLink.success')}</p>
          </div>
        )}

        {(status === 'expired' || status === 'error') && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="size-12 text-destructive" strokeWidth={1.5} />
            <p className="text-sm text-destructive">{status === 'expired' ? t('deviceLink.expired') : t('common.error')}</p>
            <button type="button" onClick={() => { setStatus('generating'); init() }}
              className="rounded-xl bg-[--accent-brand] px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-all">
              {t('deviceLink.retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
