import type { Metadata } from 'next'
import { AuthBranding } from '@/components/AuthBranding'

export const metadata: Metadata = {
  title: 'Вход и регистрация',
  robots: { index: true, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AuthBranding />
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <span className="text-xl font-black tracking-tight font-[family-name:var(--font-syne)]">QVOR</span>
          <span className="rounded-md bg-[--accent-brand-muted] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[--accent-brand]">
            beta
          </span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
        {/* Legal footer — mobile only (desktop показывает в AuthBranding) */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 lg:hidden">
          {[
            ['/terms', 'Условия'],
            ['/privacy', 'Конфиденциальность'],
            ['/cookies', 'Cookies'],
            ['/security', 'Безопасность'],
            ['/moderation', 'Модерация'],
          ].map(([href, label]) => (
            <a key={href} href={href} target="_blank"
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
