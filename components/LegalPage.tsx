'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type Section = { title: string; body: string }

type LegalPageProps = {
  titleKey: string
  introKey: string
  sections: Section[]
  updatedAt: string
  ownerKey?: string
  ownerTextKey?: string
  contacts?: { label: string; value: string; href?: string }[]
}

export function LegalPage({ titleKey, introKey, sections, updatedAt, ownerKey, ownerTextKey, contacts }: LegalPageProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">

        {/* Back */}
        <Link href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          {t('legal.backHome')}
        </Link>

        {/* Header */}
        <div className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Shield className="size-3 text-[--accent-brand]" strokeWidth={2} />
            {t('legal.lastUpdated')}: {updatedAt}
          </div>
          <h1 className="font-[family-name:var(--font-syne)] text-4xl font-black tracking-tight">
            {t(titleKey)}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t(introKey)}
          </p>
        </div>

        {/* Owner block */}
        {ownerKey && ownerTextKey && (
          <div className="mb-8 rounded-2xl border border-[--accent-brand]/30 bg-[--accent-brand-muted] p-5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[--accent-brand]">{t(ownerKey)}</p>
            <p className="text-sm text-foreground leading-relaxed">{t(ownerTextKey)}</p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted] text-[10px] font-bold text-[--accent-brand]">
                  {i + 1}
                </span>
                <h2 className="font-semibold text-base">{s.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-9 whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Contacts */}
        {contacts && contacts.length > 0 && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold text-base">{t('legal.contacts')}</h2>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-32 shrink-0">{c.label}</span>
                  {c.href
                    ? <a href={c.href} className="text-[--accent-brand] hover:underline">{c.value}</a>
                    : <span>{c.value}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-10 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">{t('terms.title')}</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t('privacy.title')}</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-foreground transition-colors">{t('cookies.title')}</Link>
          <span>·</span>
          <Link href="/security" className="hover:text-foreground transition-colors">{t('security.title')}</Link>
          <span>·</span>
          <Link href="/moderation" className="hover:text-foreground transition-colors">{t('moderation.title')}</Link>
        </div>

      </div>
    </div>
  )
}
