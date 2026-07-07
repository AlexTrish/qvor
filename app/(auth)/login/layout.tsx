import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Войти в QVOR — Безопасный мессенджер',
  description: 'Войдите в QVOR — бесплатный защищённый мессенджер с end-to-end шифрованием. Ваши сообщения видите только вы.',
  alternates: {
    canonical: 'https://qvor.ru/login',
    languages: { 'ru-RU': 'https://qvor.ru/login', 'en-US': 'https://qvor.ru/login?lang=en' },
  },
  openGraph: {
    title: 'Войти в QVOR',
    description: 'Войдите в защищённый мессенджер QVOR с end-to-end шифрованием.',
    url: 'https://qvor.ru/login',
    locale: 'ru_RU',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
