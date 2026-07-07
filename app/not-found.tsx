import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Страница не найдена | QVOR',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Большой номер */}
        <p className="font-[family-name:var(--font-syne)] text-[120px] font-black leading-none tracking-tight text-[--accent-brand] select-none">
          404
        </p>

        <h1 className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">
          Страница не найдена
        </h1>

        <p className="mt-3 text-muted-foreground">
          Такой страницы не существует или она была удалена.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/messages"
            className="flex items-center justify-center rounded-2xl bg-[--accent-brand] px-6 py-3 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-95"
          >
            Открыть чаты
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center rounded-2xl border border-border px-6 py-3 text-sm font-semibold transition-all hover:bg-muted/50 active:scale-95"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
