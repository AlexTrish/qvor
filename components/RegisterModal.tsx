'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { OtpInput } from '@/components/OtpInput'
import { PhoneInput } from '@/components/PhoneInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, ExternalLink, Lock, MessageCircle, X } from 'lucide-react'

type Step = 'phone' | 'channel' | 'telegram-link' | 'otp' | 'credentials'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

function PassphraseInput({ name, disabled }: { name: string; disabled: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input name={name} type={show ? 'text' : 'password'} placeholder="••••••••"
        disabled={disabled} required
        className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-10 text-sm transition-all focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20 disabled:opacity-50" />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}

export function RegisterModal({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [deeplink, setDeeplink] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setStep('phone'); setPhone(''); setDeeplink(''); setOtpCode('')
    setAgreed(false); setLoading(false); setError('')
  }

  function handleClose() { reset(); onClose() }

  if (!open) return null

  async function handlePhone(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 7) { setError(t('common.errorInvalidPhone')); return }
    if (!agreed) { setError(t('register.agreeRequired')); return }
    setError(''); setStep('channel')
  }

  async function handleTelegram() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/telegram-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.error'))
      setDeeplink(json.data.deeplink); setStep('telegram-link')
    } catch (err) { setError(err instanceof Error ? err.message : t('common.error')) }
    finally { setLoading(false) }
  }

  async function handleSendCode() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.error'))
      setStep('otp')
    } catch (err) { setError(err instanceof Error ? err.message : t('common.error')) }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const password = fd.get('password') as string
    const passphrase = fd.get('passphrase') as string
    const recoveryHint = fd.get('recoveryHint') as string
    setLoading(true); setError('')
    try {
      const { generateKeyPair, encryptBlob } = await import('@/lib/crypto/e2e')
      const { privateKey, publicKey } = generateKeyPair()
      const [blob, blobRecovery] = await Promise.all([
        encryptBlob(privateKey, password),
        encryptBlob(privateKey, passphrase),
      ])
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, passphrase, recoveryHint, otpCode, publicKey, blob, blobRecovery }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.error'))
      const { storePrivateKey } = await import('@/lib/crypto/e2e')
      await storePrivateKey(json.data.userId, privateKey)
      onSuccess?.()
      handleClose()
      window.location.reload()
    } catch (err) { setError(err instanceof Error ? err.message : t('common.error')) }
    finally { setLoading(false) }
  }

  const ErrorMsg = () => error ? (
    <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
  ) : null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            {step !== 'phone' && (
              <button type="button" onClick={() => { setError(''); setStep(step === 'credentials' ? 'otp' : step === 'otp' ? 'telegram-link' : step === 'telegram-link' ? 'channel' : 'phone') }}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" strokeWidth={2} />
              </button>
            )}
            <h2 className="font-[family-name:var(--font-syne)] text-base font-black tracking-tight">
              {t('register.title')}
            </h2>
          </div>
          <button type="button" onClick={handleClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'phone' && (
            <form onSubmit={handlePhone} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.phoneLabel')}</Label>
                <PhoneInput value={phone} onChange={v => { setPhone(v); setError('') }} disabled={loading} error={null} />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <div className={['flex size-5 shrink-0 mt-0.5 items-center justify-center rounded-md border-2 transition-all', agreed ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border'].join(' ')}
                  onClick={() => setAgreed(v => !v)}>
                  {agreed && <svg className="size-3 text-black" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('register.agreeText')}{' '}
                  <a href="/privacy" target="_blank" className="underline hover:text-[--accent-brand]">{t('register.agreePrivacy')}</a>
                  {' '}{t('register.agreeAnd')}{' '}
                  <a href="/terms" target="_blank" className="underline hover:text-[--accent-brand]">{t('register.agreeTerms')}</a>
                </span>
              </label>
              <ErrorMsg />
              <button type="submit" disabled={loading}
                className="btn-accent group flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97]">
                <span>{t('register.sendOtp')}</span><ArrowRight className="size-4" strokeWidth={2} />
              </button>
            </form>
          )}

          {step === 'channel' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('register.chooseChannelSubtitle')}</p>
              <ErrorMsg />
              <button type="button" onClick={handleTelegram} disabled={loading}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted] disabled:opacity-50">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[--accent-brand-muted] text-[--accent-brand]">
                  <MessageCircle className="size-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{t('register.channelTelegram')}</p>
                  <p className="text-xs text-muted-foreground">{t('register.channelTelegramDesc')}</p>
                </div>
                {loading ? <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" /> : <ArrowRight className="size-4 text-muted-foreground" strokeWidth={2} />}
              </button>
            </div>
          )}

          {step === 'telegram-link' && (
            <div className="space-y-4">
              {[t('register.telegramLinkStep1'), t('register.telegramLinkStep2'), t('register.telegramLinkStep3')].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted] text-[10px] font-bold text-[--accent-brand]">{i + 1}</div>
                  <p className="pt-0.5 text-sm">{text}</p>
                </div>
              ))}
              {deeplink && (
                <a href={deeplink} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[--accent-brand]/30 bg-[--accent-brand-muted] px-4 py-3 text-sm font-semibold text-[--accent-brand]">
                  <MessageCircle className="size-4" strokeWidth={1.5} />{t('register.telegramLinkOpen')}<ExternalLink className="size-3.5" strokeWidth={1.5} />
                </a>
              )}
              <ErrorMsg />
              <button type="button" onClick={handleSendCode} disabled={loading}
                className="btn-accent group flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-50">
                {loading ? t('register.telegramSending') : t('register.telegramSendCode')}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('login.otpSubtitle', { phone })}</p>
              <OtpInput onComplete={code => { setOtpCode(code); setStep('credentials') }} disabled={loading} />
              <ErrorMsg />
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.passwordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input name="password" type="password" placeholder="••••••••" disabled={loading} required
                    className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.passphraseLabel')}</Label>
                <PassphraseInput name="passphrase" disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.hintLabel')}</Label>
                <Input name="recoveryHint" placeholder="Подсказка..." disabled={loading} required
                  className="h-11 rounded-xl border-border bg-background focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
              <ErrorMsg />
              <button type="submit" disabled={loading}
                className="btn-accent group flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-50">
                {loading ? t('register.registering') : t('register.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
