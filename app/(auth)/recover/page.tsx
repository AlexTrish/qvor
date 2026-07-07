'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { OtpInput } from '@/components/OtpInput'
import { PhoneInput } from '@/components/PhoneInput'
import { SettingsModal } from '@/components/SettingsModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, KeyRound, Lock, ShieldAlert } from 'lucide-react'

type Step = 'phone' | 'otp' | 'passphrase' | 'new-password'
const STEPS: Step[] = ['phone', 'otp', 'passphrase', 'new-password']

export default function RecoverPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [recoveryHint, setRecoveryHint] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const stepIndex = STEPS.indexOf(step)
  const STEP_LABELS = [t('steps.phone'), t('steps.code'), t('steps.phrase'), t('steps.password')]
  const btnClass = 'btn-accent group h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97]'

  const StepProgress = () => (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < stepIndex
        const active = i === stepIndex
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                style={active ? { boxShadow: '0 0 0 4px oklch(0.75 0.18 55 / 20%)' } : undefined}
                className={[
                  'flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                  'transition-all duration-300',
                  done
                    ? 'scale-110 bg-[--accent-brand] text-black'
                    : active
                    ? 'bg-[--accent-brand] text-black'
                    : 'border-2 border-border bg-transparent text-muted-foreground dark:border-[oklch(1_0_0/30%)]',
                ].join(' ')}
              >
                {done ? (
                  <svg viewBox="0 0 12 12" fill="none" className="size-3 animate-[check_0.25s_ease-out_forwards]">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={[
                'text-[10px] font-medium transition-colors duration-200',
                active || done ? 'text-foreground' : 'text-muted-foreground',
              ].join(' ')}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative mb-4 h-px w-6 overflow-hidden rounded-full bg-border dark:bg-[oklch(1_0_0/20%)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[--accent-brand] transition-all duration-500 ease-out"
                  style={{ width: done ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 7) { setPhoneError(t('common.errorInvalidPhone')); return }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel: 'telegram' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.errorSendingOtp'))
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(code: string) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/recover/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otpCode: code }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.unknownError'))
      setRecoveryHint(json.data.recoveryHint)
      setStep('passphrase')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePassphrase(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/recover/verify-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, passphrase }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.unknownError'))
      setStep('new-password')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError(t('recover.passwordMismatch')); return }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/recover/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, passphrase, newPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.unknownError'))
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {step === 'phone' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <ShieldAlert className="size-3 text-[--accent-brand]" strokeWidth={2} />
                {t('recover.badge')}
              </div>
              <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
                {t('recover.title')}
              </h1>
            </div>
            <SettingsModal />
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('recover.phoneLabel')}
              </Label>
              <PhoneInput value={phone} onChange={(v) => { setPhone(v); setPhoneError(null) }} disabled={isLoading} error={phoneError} />
            </div>
            {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <StepProgress />
            <Button type="submit" disabled={isLoading} className={btnClass}>
              <span className="flex items-center gap-2">
                {isLoading ? t('recover.sending') : t('recover.sendOtp')}
                {!isLoading && <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />}
              </span>
            </Button>
          </form>

          <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            {t('recover.backToLogin')}
          </Link>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[--accent-brand]" />
                {t('recover.otpViaTelegram')}
              </div>
              <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
                {t('recover.otpTitle')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <SettingsModal />
              <button
                type="button"
                onClick={() => { setStep('phone'); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                {t('common.back')}
              </button>
            </div>
          </div>
          <OtpInput onComplete={handleVerifyOtp} disabled={isLoading} />
          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          <StepProgress />
        </div>
      )}

      {step === 'passphrase' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
              {t('recover.passphraseTitle')}
            </h1>
            <div className="flex items-center gap-2">
              <SettingsModal />
              <button
                type="button"
                onClick={() => { setStep('otp'); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                {t('common.back')}
              </button>
            </div>
          </div>
          {recoveryHint && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recover.passphraseHint')}</p>
              <p className="mt-1 text-sm text-foreground">{recoveryHint}</p>
            </div>
          )}
          <form onSubmit={handlePassphrase} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recover.passphraseLabel')}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                <Input type="password" placeholder="••••••••" value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)} disabled={isLoading} required
                  className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
            </div>
            {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <StepProgress />
            <Button type="submit" disabled={isLoading} className={btnClass}>
              <span className="flex items-center gap-2">
                {isLoading ? t('recover.passphraseChecking') : t('recover.passphraseSubmit')}
                {!isLoading && <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />}
              </span>
            </Button>
          </form>
        </div>
      )}

      {step === 'new-password' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
              {t('recover.newPasswordTitle')}
            </h1>
            <div className="flex items-center gap-2">
              <SettingsModal />
              <button
                type="button"
                onClick={() => { setStep('passphrase'); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                {t('common.back')}
              </button>
            </div>
          </div>
          <form onSubmit={handleNewPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recover.newPasswordLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                <Input type="password" placeholder="••••••••" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} disabled={isLoading} required minLength={8}
                  className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('recover.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                <Input type="password" placeholder="••••••••" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} required
                  className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
            </div>
            {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <StepProgress />
            <Button type="submit" disabled={isLoading} className={btnClass}>
              <span className="flex items-center gap-2">
                {isLoading ? t('recover.newPasswordSaving') : t('recover.newPasswordSubmit')}
                {!isLoading && <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />}
              </span>
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
