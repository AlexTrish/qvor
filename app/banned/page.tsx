'use client'

import { Shield, Mail } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

export default function BannedPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Иконка */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <Shield className="size-10 text-destructive" strokeWidth={1.5} />
        </div>

        {/* Заголовок */}
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
          Аккаунт заблокирован
        </h1>

        <p className="mt-3 text-muted-foreground leading-relaxed">
          Ваш аккаунт был заблокирован администрацией QVOR за нарушение{' '}
          <Link href="/terms" className="text-foreground underline underline-offset-4 hover:text-[--accent-brand] transition-colors">
            условий использования
          </Link>
          .
        </p>

        {/* Разделитель */}
        <div className="my-8 h-px bg-border" />

        {/* Что делать */}
        <div className="rounded-2xl border border-border bg-card p-5 text-left space-y-3">
          <p className="text-sm font-semibold">Что делать?</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50 mt-2" />
              Если вы считаете блокировку ошибкой — напишите нам
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50 mt-2" />
              Укажите ваш номер телефона и причину обращения
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50 mt-2" />
              Мы рассмотрим обращение в течение 3 рабочих дней
            </li>
          </ul>
        </div>

        {/* Кнопка обращения */}
        <a
          href="mailto:support@qvor.ru?subject=Разблокировка аккаунта"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[--accent-brand] py-3 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-95"
        >
          <Mail className="size-4" strokeWidth={2} />
          Написать в поддержку
        </a>

        <p className="mt-6 text-xs text-muted-foreground">
          support@qvor.ru
        </p>
      </div>
    </div>
  )
}
