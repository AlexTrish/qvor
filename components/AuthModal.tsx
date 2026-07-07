'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { OtpInput } from '@/components/OtpInput'
import { PhoneInput } from '@/components/PhoneInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Lock, MessageCircle, X } from 'lucide-react'
import { authApi } from '@/lib/api'

type Step = 'phone' | 'otp'

type Props = {
  open: boolean
  onClose: () => void
  /** Called after successful login with userId + blob */
  onSuccess?: (userId: string, blob: string, password: string) => void
  title?: string
}

export function AuthModal({ open, onClose, onSuccess, title }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tgToken, setTgToken] = useState<string | null>(null)
  const [tgLoading, setTgLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) {
      setStep('phone'); setPhone(''); setPassword('')
      setError(''); setPhoneError(''); setTgToken(null)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  if (!open) return null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 7) { setPhoneError(t('common.errorInvalidPhone')); return }
    setLoading(true); setError('')
    try {
      const res = await authApi.login(phone, password)
      if (res.error) throw new Error(res.error)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally { setLoading(false) }
  }

  async function handleOtp(code: string) {
    setLoading(true); setError('')
    try {
      const res = await authApi.verifyOtp(phone, code)
      if (res.error || !res.data) throw new Error(res.error ?? t('common.error'))
      onSuccess?.(res.data.userId, res.data.blob, password)
      onClose()
      // Reload to pick up new session
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally { setLoading(false) }
  }

  async function handleTgConfirm() {
    setTgLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/2fa-confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'request' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.error'))
      setTgToken(json.data.confirmToken)
      pollRef.current = setInterval(async () => {
        const pr = await fetch('/api/auth/2fa-confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, action: 'poll', token: json.data.confirmToken }),
        })
        const pj = await pr.json()
        if (pj.data?.approved) { clearInterval(pollRef.current!); onClose(); window.location.reload() }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally { setTgLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {step === 'otp' && (
              <button type="button" onClick={() => { setStep('phone'); setError('') }}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" strokeWidth={2} />
              </button>
            )}
            <h2 className="font-[family-name:var(--font-syne)] text-base font-black tracking-tight">
              {title ?? t('login.title')}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'phone' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('login.phoneLabel')}
                </Label>
                <PhoneInput value={phone} onChange={v => { setPhone(v); setPhoneError('') }}
                  disabled={loading} error={phoneError || null} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('login.passwordLabel')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input type="password" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} disabled={loading} required
                    className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
              </div>
              {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              <button type="submit" disabled={loading}
                className="btn-accent group flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-50">
                {loading ? t('login.loading') : (
                  <><span>{t('login.submit')}</span><ArrowRight className="size-4" strokeWidth={2} /></>
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('login.otpSubtitle', { phone })}</p>
              <OtpInput onComplete={handleOtp} disabled={loading} />
              {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">или</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {!tgToken ? (
                <button type="button" onClick={handleTgConfirm} disabled={tgLoading}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted] disabled:opacity-50">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[--accent-brand-muted] text-[--accent-brand]">
                    <MessageCircle className="size-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t('login.tgConfirmTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('login.tgConfirmDesc')}</p>
                  </div>
                  {tgLoading && <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />}
                </button>
              ) : (
                <div className="rounded-2xl border border-[--accent-brand]/30 bg-[--accent-brand-muted] p-3 text-center">
                  <div className="mb-1.5 flex justify-center">
                    <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                  </div>
                  <p className="text-sm font-medium text-[--accent-brand]">{t('login.tgConfirmWaiting')}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('login.tgConfirmWaitingDesc')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
