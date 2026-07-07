import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — QVOR',
  description: 'Политика конфиденциальности QVOR. Мы храним только хэш номера телефона и зашифрованные сообщения. Сервер не читает вашу переписку.',
  alternates: {
    canonical: 'https://qvor.ru/privacy',
    languages: { 'ru-RU': 'https://qvor.ru/privacy', 'en-US': 'https://qvor.ru/privacy?lang=en' },
  },
  openGraph: {
    title: 'Политика конфиденциальности — QVOR',
    description: 'Как QVOR защищает ваши данные. End-to-end шифрование, минимальный сбор данных.',
    url: 'https://qvor.ru/privacy',
    locale: 'ru_RU',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
