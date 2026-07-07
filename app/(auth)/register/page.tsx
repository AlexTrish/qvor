'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useFormSession } from '@/hooks/useFormSession'
import { OtpInput } from '@/components/OtpInput'
import { PhoneInput } from '@/components/PhoneInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { SettingsModal } from '@/components/SettingsModal'

type Step = 'phone' | 'otp' | 'password' | 'passphrase'
const PROGRESS_STEPS: Step[] = ['phone', 'otp', 'password']

type FormState = {
  step: Step
  phone: string
  otpCode: string
  password: string
  agreed: boolean
  isLoading: boolean
  error: string
}

const PASSPHRASE_PRESETS = [
  { emoji: '🐾', ru: 'Первый домашний питомец', en: 'First pet' },
  { emoji: '🏫', ru: 'Номер школы', en: 'School number' },
  { emoji: '🌆', ru: 'Город детства', en: 'Childhood city' },
  { emoji: '🎂', ru: 'Любимое блюдо', en: 'Favourite food' },
  { emoji: '🎵', ru: 'Первая группа', en: 'First band' },
  { emoji: '🚗', ru: 'Первая машина', en: 'First car' },
  { emoji: '👤', ru: 'Лучший друг', en: 'Best friend' },
  { emoji: '📚', ru: 'Любимая книга', en: 'Favourite book' },
  { emoji: '🎮', ru: 'Первая игра', en: 'First game' },
  { emoji: '🏖️', ru: 'Любимое место', en: 'Favourite place' },
  { emoji: '🌍', ru: 'Страна мечты', en: 'Dream country' },
  { emoji: '⚽', ru: 'Любимый спорт', en: 'Favourite sport' },
]

function PasswordInput({ name, placeholder, disabled, value, onChange }: {
  name: string; placeholder?: string; disabled: boolean
  value?: string; onChange?: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
      <input
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder ?? '••••••••'}
        disabled={disabled}
        required
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm transition-all focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20 disabled:opacity-50"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-150 hover:text-foreground">
        {show ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
      </button>
    </div>
  )
}

function HintPicker({ name, disabled }: { name: string; disabled: boolean }) {
  const { lang } = useTranslation()
  const [value, setValue] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  function pick(preset: typeof PASSPHRASE_PRESETS[0]) {
    const label = lang === 'ru' ? preset.ru : preset.en
    setValue(label)
    setSelected(preset.emoji)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {PASSPHRASE_PRESETS.map((p) => {
          const isActive = selected === p.emoji
          const label = lang === 'ru' ? p.ru : p.en
          return (
            <button key={p.emoji} type="button" disabled={disabled} onClick={() => pick(p)} title={label}
              className={['relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-150 active:scale-95',
                isActive ? 'border-[--accent-brand] bg-[--accent-brand-muted] shadow-[0_0_0_3px_oklch(0.75_0.18_55_/_15%)]'
                  : 'border-border bg-card hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted]/50'].join(' ')}>
              <span className="text-2xl leading-none select-none">{p.emoji}</span>
              <span className={['text-[10px] font-medium leading-tight text-center line-clamp-2',
                isActive ? 'text-[--accent-brand]' : 'text-muted-foreground'].join(' ')}>{label}</span>
              {isActive && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[--accent-brand]">
                  <Check className="size-2.5 text-black" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="relative">
        {selected && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none select-none">{selected}</span>}
        <input name={name} type="text" value={value}
          onChange={(e) => { setValue(e.target.value); if (!e.target.value) setSelected(null) }}
          required disabled={disabled}
          placeholder="Своя подсказка..."
          className={['h-11 w-full rounded-xl border border-border bg-background text-sm transition-all',
            'focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20 disabled:opacity-50',
            selected ? 'pl-9 pr-4' : 'px-4'].join(' ')} />
      </div>
    </div>
  )
}

function PasswordStep({ disabled, error, onSubmit, onBack, StepProgress, BackBtn, btnClass }: {
  disabled: boolean; error: string; onSubmit: (pwd: string) => void; onBack: () => void
  StepProgress: () => React.ReactElement; BackBtn: ({ onClick }: { onClick: () => void }) => React.ReactElement
  btnClass: string
}) {
  const { t } = useTranslation()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const match = pwd.length >= 8 && pwd === confirm

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwd !== confirm) { setMismatch(true); return }
    setMismatch(false); onSubmit(pwd)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><BackBtn onClick={onBack} /><SettingsModal /></div>
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">{t('register.accountTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('register.passwordSubtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.passwordLabel')}</Label>
          <PasswordInput name="password" disabled={disabled} value={pwd} onChange={(v) => { setPwd(v); setMismatch(false) }} />
          {pwd.length > 0 && pwd.length < 8 && <p className="text-xs text-muted-foreground">{t('common.passwordMinLength')}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.passwordConfirmLabel')}</Label>
          <div className="relative">
            <PasswordInput name="passwordConfirm" disabled={disabled} value={confirm} onChange={(v) => { setConfirm(v); setMismatch(false) }} />
            {match && <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2"><Check className="size-4 text-[--accent-brand]" strokeWidth={2.5} /></span>}
          </div>
        </div>
        {mismatch && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{t('recover.passwordMismatch')}</p>}
        {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <StepProgress />
        <Button type="submit" disabled={disabled || pwd.length < 8} className={btnClass}>
          <span className="flex items-center gap-2">{t('register.nextStep')}<ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} /></span>
        </Button>
      </form>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [form, setForm, clearForm] = useFormSession<FormState>('register', {
    step: 'phone', phone: '', otpCode: '', password: '', agreed: false, isLoading: false, error: '',
  })

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.phone.length < 7) { setForm({ error: t('common.errorInvalidPhone') }); return }
    if (!form.agreed) { setForm({ error: t('register.agreeRequired') }); return }

    setForm({ isLoading: true, error: '' })
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.errorSendingOtp'))
      setForm({ step: 'otp', error: '' })
    } catch (err) {
      setForm({ error: err instanceof Error ? err.message : t('common.unknownError') })
    } finally {
      setForm({ isLoading: false })
    }
  }

  function handleOtpComplete(code: string) {
    setForm({ otpCode: code, step: 'password' })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const passphrase = fd.get('passphrase') as string
    const recoveryHint = fd.get('recoveryHint') as string
    const password = form.password

    setForm({ isLoading: true, error: '' })
    try {
      const { generateKeyPair, encryptBlob } = await import('@/lib/crypto/e2e')
      const { privateKey, publicKey } = generateKeyPair()
      const [blob, blobRecovery] = await Promise.all([
        encryptBlob(privateKey, password),
        encryptBlob(privateKey, passphrase),
      ])

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, password, passphrase, recoveryHint, otpCode: form.otpCode, publicKey, blob, blobRecovery }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('common.errorRegister'))

      const { storePrivateKey } = await import('@/lib/crypto/e2e')
      await storePrivateKey(json.data.userId, privateKey)

      clearForm()
      router.push('/onboarding')
    } catch (err) {
      setForm({ error: err instanceof Error ? err.message : t('common.unknownError') })
    } finally {
      setForm({ isLoading: false })
    }
  }

  const progressIndex = PROGRESS_STEPS.indexOf(form.step === 'passphrase' ? 'password' : form.step)
  const STEP_LABELS = [t('steps.phone'), t('steps.code'), t('steps.account')]

  const StepProgress = () => (
    <div className="flex items-center justify-center gap-2">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < progressIndex; const active = i === progressIndex
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div style={active ? { boxShadow: '0 0 0 4px oklch(0.75 0.18 55 / 20%)' } : undefined}
                className={['flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300',
                  done ? 'scale-110 bg-[--accent-brand] text-black' : active ? 'bg-[--accent-brand] text-black'
                    : 'border-2 border-border bg-transparent text-muted-foreground dark:border-[oklch(1_0_0/30%)]'].join(' ')}>
                {done ? <svg viewBox="0 0 12 12" fill="none" className="size-3 animate-[check_0.25s_ease-out_forwards]"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
              </div>
              <span className={['text-[10px] font-medium transition-colors duration-200', active || done ? 'text-foreground' : 'text-muted-foreground'].join(' ')}>{STEP_LABELS[i]}</span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className="relative mb-4 h-px w-10 overflow-hidden rounded-full bg-border dark:bg-[oklch(1_0_0/20%)]">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[--accent-brand] transition-all duration-500 ease-out" style={{ width: done ? '100%' : '0%' }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const btnClass = 'btn-accent group h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97]'
  const ErrorMsg = () => form.error ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{form.error}</p> : null
  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
      <ArrowLeft className="size-3.5" strokeWidth={2} />{t('common.back')}
    </button>
  )

  return (
    <div className="space-y-8">

      {/* Шаг 1 — Телефон */}
      {form.step === 'phone' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">{t('register.title')}</h1>
            <SettingsModal />
          </div>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.phoneLabel')}</Label>
              <PhoneInput value={form.phone} onChange={(v) => setForm({ phone: v, error: '' })} disabled={form.isLoading} error={form.error || null} />
            </div>
            <StepProgress />
            <label className="flex cursor-pointer items-start gap-3">
              <div className="relative mt-0.5 flex shrink-0">
                <input type="checkbox" checked={form.agreed} onChange={(e) => setForm({ agreed: e.target.checked, error: '' })} className="peer sr-only" />
                <div className={['flex size-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                  form.agreed ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border bg-background dark:border-[oklch(1_0_0/30%)]'].join(' ')}>
                  {form.agreed && <svg className="size-3 text-black" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </div>
              <span className="text-sm text-muted-foreground leading-relaxed">
                {t('register.agreeText')}{' '}
                <a href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-[--accent-brand]">{t('register.agreePrivacy')}</a>
                {' '}{t('register.agreeAnd')}{' '}
                <a href="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-[--accent-brand]">{t('register.agreeTerms')}</a>
                {', '}
                <a href="/cookies" target="_blank" className="font-medium text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-[--accent-brand]">{t('register.agreeCookies')}</a>
              </span>
            </label>
            <Button type="submit" disabled={form.isLoading} className={btnClass}>
              <span className="flex items-center gap-2">{t('register.sendOtp')}<ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} /></span>
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t('register.haveAccount')}{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-[--accent-brand]">{t('register.login')}</Link>
          </p>
        </div>
      )}

      {/* Шаг 2 — OTP */}
      {form.step === 'otp' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <BackBtn onClick={() => setForm({ step: 'phone', error: '' })} />
            <SettingsModal />
          </div>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">{t('register.otpTitle')}</h1>
            <p className="text-sm text-muted-foreground">Код отправлен на почту или в консоль сервера</p>
          </div>
          <OtpInput onComplete={handleOtpComplete} disabled={form.isLoading} />
          <ErrorMsg />
          <StepProgress />
        </div>
      )}

      {/* Шаг 3 — Пароль */}
      {form.step === 'password' && (
        <PasswordStep
          disabled={form.isLoading}
          error={form.error}
          onSubmit={(pwd) => setForm({ password: pwd, step: 'passphrase', error: '' })}
          onBack={() => setForm({ step: 'otp', error: '' })}
          StepProgress={StepProgress}
          BackBtn={BackBtn}
          btnClass={btnClass}
        />
      )}

      {/* Шаг 4 — Кодовая фраза */}
      {form.step === 'passphrase' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <BackBtn onClick={() => setForm({ step: 'password', error: '' })} />
            <SettingsModal />
          </div>
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">{t('register.passphraseTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('register.passphraseSubtitle')}</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.passphraseLabel')}</Label>
              <PasswordInput name="passphrase" disabled={form.isLoading} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('register.hintLabel')}</Label>
              <p className="text-xs text-muted-foreground">{t('register.hintHelp')}</p>
              <HintPicker name="recoveryHint" disabled={form.isLoading} />
            </div>
            {form.error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{form.error}</p>}
            <StepProgress />
            <Button type="submit" disabled={form.isLoading} className={btnClass}>
              <span className="flex items-center gap-2">
                {form.isLoading ? t('register.registering') : t('register.submit')}
                {!form.isLoading && <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />}
              </span>
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
