import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Условия использования — QVOR',
  description: 'Условия использования сервиса QVOR — безопасного мессенджера с end-to-end шифрованием.',
  alternates: {
    canonical: 'https://qvor.ru/terms',
    languages: { 'ru-RU': 'https://qvor.ru/terms', 'en-US': 'https://qvor.ru/terms?lang=en' },
  },
  openGraph: {
    title: 'Условия использования — QVOR',
    description: 'Правила использования мессенджера QVOR.',
    url: 'https://qvor.ru/terms',
    locale: 'ru_RU',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
