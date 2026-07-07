'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { OtpMethodPicker } from '@/components/OtpMethodPicker'
import { PhoneInput } from '@/components/PhoneInput'
import { SettingsModal } from '@/components/SettingsModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Lock, Mail } from 'lucide-react'

type Step = 'phone' | 'email-setup' | 'otp'

export default function LoginPage() {
  const { step: authStep, phone, isLoading, error, login, verifyOtp, goBack, unlockKeys } = useAuth()
  const { t } = useTranslation()
  const [localStep, setLocalStep] = useState<Step>('phone')
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'code'>('input')
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [needsEmail, setNeedsEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phoneValue.length < 7) { setPhoneError(t('common.errorInvalidPhone')); return }
    
    // Проверяем есть ли email у пользователя
    const methodsRes = await fetch(`/api/auth/otp-methods?phone=${phoneValue.replace(/^\+/, '')}`)
    if (methodsRes.ok) {
      const methodsData = await methodsRes.json()
      if (!methodsData.data?.email) {
        setNeedsEmail(true)
        setLocalStep('email-setup')
        return
      }
    }
    
    await login(phoneValue, password)
    setLocalStep('otp')
  }

  async function sendEmailCode() {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) return
    setEmailSending(true)
    setEmailError('')
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, lang: 'ru' }),
    })
    setEmailSending(false)
    if (res.ok) setEmailStep('code')
    else setEmailError('Не удалось отправить код')
  }

  async function verifyEmailCode() {
    if (!emailCode || emailCode.length !== 6) return
    setEmailSending(true)
    setEmailError('')
    
    // Сначала логинимся
    await login(phoneValue, password)
    
    // Потом привязываем email
    const res = await fetch('/api/users/me/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, code: emailCode }),
      credentials: 'include',
    })
    
    setEmailSending(false)
    if (res.ok) {
      setLocalStep('otp')
    } else {
      setEmailError('Неверный код')
    }
  }

  async function handleOtpComplete(code: string) {
    await verifyOtp(code)
    const meRes = await fetch('/api/users/me', { credentials: 'include' })
    if (meRes.ok) {
      const meJson = await meRes.json()
      const blobData = meJson.data?.blob
      const userId = meJson.data?.id
      if (blobData && userId && password) {
        await unlockKeys(blobData, password, userId)
      }
    }
  }

  // Email setup step
  if (localStep === 'email-setup') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <SettingsModal />
          <button type="button" onClick={() => setLocalStep('phone')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            {t('common.back')}
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
              Добавьте email
            </h2>
            <p className="text-sm text-muted-foreground">
              Для получения кода авторизации необходимо привязать email
            </p>
          </div>

          {emailError && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{emailError}</p>
          )}

          {emailStep === 'input' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="example@mail.com"
                    className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
                  />
                </div>
              </div>
              <Button type="button" onClick={sendEmailCode} disabled={emailSending || !emailInput}
                className="btn-accent h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97]">
                {emailSending ? 'Отправляем...' : 'Отправить код'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Код отправлен на {emailInput}</p>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Код подтверждения
                </Label>
                <Input
                  type="text"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="h-11 rounded-xl border-border bg-background text-center font-mono tracking-widest focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
                />
              </div>
              <Button type="button" onClick={verifyEmailCode} disabled={emailSending || emailCode.length !== 6}
                className="btn-accent h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97]">
                {emailSending ? 'Проверяем...' : 'Подтвердить'}
              </Button>
              <button type="button" onClick={() => setEmailStep('input')}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                Изменить email
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (localStep === 'otp' || authStep === 'otp') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <SettingsModal />
          <button type="button" onClick={() => { goBack(); setLocalStep('phone') }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            {t('common.back')}
          </button>
        </div>

        <OtpMethodPicker
          phone={phone}
          onComplete={handleOtpComplete}
          onTgButtonApproved={() => { window.location.href = '/' }}
          isLoading={isLoading}
          error={error}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
          {t('login.title')}
        </h1>
        <SettingsModal />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('login.phoneLabel')}
          </Label>
          <PhoneInput
            value={phoneValue}
            onChange={(v) => { setPhoneValue(v); setPhoneError(null) }}
            disabled={isLoading}
            error={phoneError}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('login.passwordLabel')}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
            <Input id="password" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required
              className="h-11 rounded-xl border-border bg-background pl-10 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={isLoading}
          className="btn-accent group h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97]">
          {isLoading ? t('login.loading') : (
            <span className="flex items-center gap-2">
              {t('login.submit')}
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />
            </span>
          )}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4 transition-colors duration-150 hover:text-[--accent-brand]">
            {t('login.signup')}
          </Link>
        </p>
        <Link href="/recover" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
          {t('login.forgotPassword')}
        </Link>
      </div>
    </div>
  )
}
