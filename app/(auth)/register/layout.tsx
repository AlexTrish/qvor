import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Регистрация в QVOR — Создать аккаунт',
  description: 'Создайте бесплатный аккаунт в QVOR — защищённом мессенджере с end-to-end шифрованием. Регистрация по номеру телефона.',
  alternates: {
    canonical: 'https://qvor.ru/register',
    languages: { 'ru-RU': 'https://qvor.ru/register', 'en-US': 'https://qvor.ru/register?lang=en' },
  },
  openGraph: {
    title: 'Регистрация в QVOR',
    description: 'Создайте аккаунт в защищённом мессенджере QVOR. Бесплатно, без рекламы.',
    url: 'https://qvor.ru/register',
    locale: 'ru_RU',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
