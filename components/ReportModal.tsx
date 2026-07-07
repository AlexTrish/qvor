'use client'

import { useState } from 'react'
import { Flag, X, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

type TargetType = 'user' | 'channel' | 'message'

type Reason = {
  id: string
  label: string
  desc: string
  critical?: boolean
}

const REASONS: Reason[] = [
  { id: 'spam',            label: 'Спам',                    desc: 'Массовые нежелательные сообщения' },
  { id: 'harassment',      label: 'Преследование / угрозы',  desc: 'Запугивание, угрозы, травля' },
  { id: 'fraud',           label: 'Мошенничество',           desc: 'Обман, фишинг, скам' },
  { id: 'illegal_content', label: 'Незаконный контент',      desc: 'Контент, нарушающий законодательство РФ' },
  { id: 'csam',            label: 'CSAM',                    desc: 'Сексуальный контент с участием несовершеннолетних', critical: true },
  { id: 'terrorism',       label: 'Терроризм / экстремизм',  desc: 'Призывы к насилию, экстремистские материалы', critical: true },
  { id: 'malware',         label: 'Вредоносное ПО',          desc: 'Вирусы, трояны, вредоносные ссылки' },
  { id: 'copyright',       label: 'Нарушение авторских прав', desc: 'Незаконное использование чужого контента' },
  { id: 'misinformation',  label: 'Дезинформация',           desc: 'Заведомо ложная информация' },
  { id: 'other',           label: 'Другое',                  desc: 'Иное нарушение правил' },
]

type Props = {
  targetType: TargetType
  targetId: string
  targetName?: string
  onClose: () => void
}

type Step = 'reason' | 'comment' | 'done'

export function ReportModal({ targetType, targetId, targetName, onClose }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('reason')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const targetLabels: Record<TargetType, string> = {
    user: 'пользователя',
    channel: 'канал / группу',
    message: 'сообщение',
  }

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, comment: comment.trim() || undefined }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'already_reported') {
          setError('Вы уже подавали жалобу на этот объект')
        } else {
          setError(json.error ?? 'Ошибка при отправке жалобы')
        }
        return
      }
      setStep('done')
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const selectedReason = REASONS.find(r => r.id === reason)

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-destructive/10">
              <Flag className="size-4 text-destructive" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold">Пожаловаться</p>
              {targetName && <p className="text-xs text-muted-foreground truncate max-w-[180px]">на {targetLabels[targetType]}: {targetName}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Step: reason */}
        {step === 'reason' && (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {REASONS.map(r => (
              <button key={r.id} type="button"
                onClick={() => { setReason(r.id); setStep('comment') }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted/50',
                  r.critical && 'hover:bg-destructive/5',
                )}>
                <div className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                  r.critical ? 'bg-destructive/15' : 'bg-muted',
                )}>
                  {r.critical
                    ? <AlertTriangle className="size-3 text-destructive" strokeWidth={2} />
                    : <Flag className="size-3 text-muted-foreground" strokeWidth={1.5} />
                  }
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', r.critical && 'text-destructive')}>{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: comment */}
        {step === 'comment' && selectedReason && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Причина</p>
              <p className="text-sm font-medium">{selectedReason.label}</p>
            </div>

            {selectedReason.critical && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" strokeWidth={2} />
                <p className="text-xs text-destructive leading-relaxed">
                  Это критическое нарушение. Жалоба будет рассмотрена в приоритетном порядке в течение 24 часов.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Дополнительные сведения (необязательно)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Опишите нарушение подробнее..."
                maxLength={1000}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
              />
              <p className="text-right text-[10px] text-muted-foreground">{comment.length}/1000</p>
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('reason')}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
                Назад
              </button>
              <button type="button" onClick={submit} disabled={loading}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Отправка...</span>
                  : 'Отправить жалобу'
                }
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-500/15">
              <Check className="size-7 text-green-500" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Жалоба отправлена</p>
              <p className="text-sm text-muted-foreground">
                Мы рассмотрим её в течение{' '}
                {selectedReason?.critical ? '24 часов' : '7 рабочих дней'}.
                Спасибо, что помогаете сделать QVOR безопаснее.
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background hover:opacity-85 transition-all">
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
