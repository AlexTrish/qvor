'use client'

import { useState, useEffect } from 'react'
import { Mail, Terminal, ArrowRight, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { OtpInput } from '@/components/OtpInput'
import { cn } from '@/lib/utils'

type Methods = {
  email: boolean
  console: boolean // всегда true для существующих пользователей
}

type Props = {
  phone: string
  onComplete: (code: string) => void
  onTgButtonApproved: () => void // оставляем для совместимости
  isLoading: boolean
  error: string | null
}

type Step = 'pick' | 'code'
type MethodKey = 'email' | 'console'

export function OtpMethodPicker({ phone, onComplete, isLoading, error }: Props) {
  const { t } = useTranslation()
  const [methods, setMethods] = useState<Methods | null>(null)
  const [step, setStep] = useState<Step>('pick')
  const [selectedMethod, setSelectedMethod] = useState<MethodKey | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    const normalizedPhone = phone.replace(/^\+/, '')
    fetch(`/api/auth/otp-methods?phone=${normalizedPhone}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setMethods({
            email: !!j.data.email,
            console: true, // всегда доступен для существующих пользователей
          })
        }
      })
      .catch(() => setMethods({ email: false, console: true }))
  }, [phone])

  async function sendCode(method: MethodKey) {
    setSending(true)
    setSendError('')
    try {
      const normalizedPhone = phone.replace(/^\+/, '')
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, channel: method }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(
        typeof json.error === 'string' ? json.error
        : json.error?.fieldErrors ? Object.values(json.error.fieldErrors).flat().join(', ')
        : t('common.unknownError')
      )
      setSelectedMethod(method)
      setSent(true)
      setStep('code')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setSending(false)
    }
  }

  // Если только один метод — сразу отправляем
  useEffect(() => {
    if (!methods) return
    if (!methods.email && methods.console && step === 'pick') {
      // Только консоль — автоматически отправляем
      sendCode('console')
    }
  }, [methods])

  if (step === 'code') {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
            Введите код
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedMethod === 'email'
              ? 'Код отправлен на вашу почту'
              : 'Код отправлен в чат QVOR и выведен в консоль сервера'
            }
          </p>
        </div>

        <OtpInput onComplete={onComplete} disabled={isLoading} />

        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { setStep('pick'); setSent(false) }}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← Другой способ
          </button>
          <button type="button" onClick={() => sendCode(selectedMethod!)} disabled={sending}
            className="text-sm text-[--accent-brand] hover:opacity-70 transition-opacity disabled:opacity-40">
            {sending ? 'Отправляем...' : 'Отправить снова'}
          </button>
        </div>
      </div>
    )
  }

  // Шаг выбора метода
  const loading = methods === null

  const methodItems: { key: MethodKey; icon: React.ReactNode; title: string; desc: string; available: boolean }[] = [
    {
      key: 'email',
      icon: <Mail className="size-4" strokeWidth={1.5} />,
      title: 'Код на почту',
      desc: 'Отправим 6-значный код на вашу email',
      available: methods?.email ?? false,
    },
    {
      key: 'console',
      icon: <Terminal className="size-4" strokeWidth={1.5} />,
      title: 'Код в чат QVOR',
      desc: 'Код придёт в системный чат и в консоль сервера',
      available: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
          Подтверждение входа
        </h2>
        <p className="text-sm text-muted-foreground">Выберите способ получения кода</p>
      </div>

      {sendError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{sendError}</p>
      )}

      <div className="space-y-2">
        {methodItems.map(m => (
          <button key={m.key} type="button"
            disabled={!m.available || sending}
            onClick={() => sendCode(m.key)}
            className={cn(
              'group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150',
              m.available
                ? 'border-border bg-card hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted] active:scale-[0.98]'
                : 'border-border/50 bg-card/50 cursor-not-allowed opacity-40',
            )}>
            <div className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
              m.available
                ? 'bg-[--accent-brand-muted] text-[--accent-brand] group-hover:bg-[--accent-brand]/20'
                : 'bg-muted text-muted-foreground',
            )}>
              {loading
                ? <div className="size-4 animate-pulse rounded-full bg-current opacity-30" />
                : m.icon
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn('text-sm font-semibold', !m.available && 'text-muted-foreground')}>
                  {m.title}
                </p>
                {!m.available && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    недоступно
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </div>

            {m.available && (
              sending
                ? <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent shrink-0" />
                : <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[--accent-brand]" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
