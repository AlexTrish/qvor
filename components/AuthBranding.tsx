'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { AuthPattern } from '@/components/AuthPattern'

export function AuthBranding() {
  const { t } = useTranslation()

  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12 overflow-hidden">
      <AuthPattern />

      <div className="relative z-10 flex items-center gap-2">
        <span className="text-xl font-black tracking-tight font-[family-name:var(--font-syne)]">QVOR</span>
        <span className="rounded-md bg-[--accent-brand-muted] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[--accent-brand]">
          beta
        </span>
      </div>

      <div className="relative z-10 space-y-4">
        <p className="text-4xl font-black leading-none tracking-tight font-[family-name:var(--font-syne)]">
          {t('brand.tagline1')}<br />
          {t('brand.tagline2')}<br />
          <span className="text-[--accent-brand]">{t('brand.tagline3')}</span>
        </p>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {t('brand.description')}
        </p>
      </div>

      <div className="relative z-10 space-y-2">
        <p className="text-xs text-muted-foreground">{t('brand.copyright')}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { href: '/terms', key: 'terms.title' },
            { href: '/privacy', key: 'privacy.title' },
            { href: '/cookies', key: 'legal.cookies' },
            { href: '/security', key: 'legal.security' },
            { href: '/moderation', key: 'legal.moderation' },
          ].map(({ href, key }) => (
            <a key={href} href={href} target="_blank"
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2">
              {t(key)}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
