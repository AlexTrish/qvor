import type { Metadata } from 'next'
import { Geist, Geist_Mono, Syne } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import { LanguageProvider } from '@/app/components/LanguageProvider'
import { AppStoreProvider } from '@/hooks/useAppStore'
import { CallProvider } from '@/components/CallProvider'
import { EmailSetupModal } from '@/components/EmailSetupModal'
import { detectPreferredLanguage } from '@/lib/i18n'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const syne = Syne({ variable: '--font-syne', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export async function generateMetadata(): Promise<Metadata> {
  const titleRu = 'QVOR — Безопасный мессенджер с E2E шифрованием'
  const descriptionRu = 'Бесплатный защищённый мессенджер с end-to-end шифрованием. Сервер не видит ваши сообщения — это не обещание, это математика. Голосовые сообщения, звонки, каналы, группы.'
  const keywordsRu = [
    'безопасный мессенджер',
    'защищённый чат',
    'end-to-end шифрование',
    'конфиденциальный мессенджер',
    'шифрование сообщений',
    'чат без слежки',
    'приватный чат',
    'защита переписки',
    'QVOR',
    'мессенджер Россия',
    'бесплатный мессенджер',
    'голосовые сообщения',
    'видеозвонки',
    'secure messaging',
    'encrypted chat',
    'private messenger',
  ]

  return {
    title: {
      default: titleRu,
      template: `%s — QVOR`,
    },
    description: descriptionRu,
    keywords: keywordsRu,
    authors: [{ name: 'QVOR Team', url: 'https://qvor.ru' }],
    creator: 'QVOR',
    publisher: 'QVOR',
    category: 'technology',
    classification: 'Messaging Application',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL('https://qvor.ru'),
    alternates: {
      canonical: 'https://qvor.ru',
      languages: {
        'ru-RU': 'https://qvor.ru',
        'en-US': 'https://qvor.ru/?lang=en',
        'x-default': 'https://qvor.ru',
      },
    },
    openGraph: {
      title: titleRu,
      description: descriptionRu,
      url: 'https://qvor.ru',
      siteName: 'QVOR',
      images: [
        {
          url: 'https://qvor.ru/og-image.png',
          width: 1200,
          height: 630,
          alt: 'QVOR — Безопасный мессенджер',
          type: 'image/png',
        },
      ],
      locale: 'ru_RU',
      alternateLocale: ['en_US'],
      type: 'website',
      countryName: 'Russia',
    },
    twitter: {
      card: 'summary_large_image',
      title: titleRu,
      description: 'Бесплатный мессенджер с E2E шифрованием. Сервер не читает ваши сообщения.',
      images: ['https://qvor.ru/og-image.png'],
      creator: '@qvor_app',
      site: '@qvor_app',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      ],
      shortcut: '/favicon.ico',
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    other: {
      // Яндекс — русскоязычный регион
      'yandex-verification': 'ef5b19ac960c7316',
      'yandex:region': '213',           // Москва
      'yandex:country': 'RU',
      // Тема и PWA
      'theme-color': '#f59e0b',
      'color-scheme': 'dark light',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': 'QVOR',
      'application-name': 'QVOR',
      'msapplication-TileColor': '#f59e0b',
      'msapplication-config': '/browserconfig.xml',
      // География для поисковиков
      'geo.region': 'RU',
      'geo.country': 'Russia',
      'geo.placename': 'Russia',
      // Язык контента
      'content-language': 'ru',
      // Дополнительные теги
      'rating': 'general',
      'revisit-after': '7 days',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const langCookie = cookieStore.get('qvor_lang')?.value
  const themeCookie = cookieStore.get('qvor_theme')?.value ?? 'system'
  const acceptLanguage = headerStore.get('accept-language')
  const lang = langCookie ?? detectPreferredLanguage(null, acceptLanguage)

  const fontClasses = `${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased`

  return (
    <html lang={lang} className={fontClasses} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t='${themeCookie}';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'QVOR',
            url: 'https://qvor.ru',
            description: 'Бесплатный защищённый мессенджер с end-to-end шифрованием',
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Web, Android, iOS',
            inLanguage: ['ru', 'en'],
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
            featureList: [
              'End-to-end шифрование',
              'Голосовые сообщения',
              'Видеозвонки',
              'Каналы и группы',
              'Истории',
            ],
            screenshot: 'https://qvor.ru/og-image.png',
            author: { '@type': 'Organization', name: 'QVOR', url: 'https://qvor.ru' },
            areaServed: { '@type': 'Country', name: 'Russia' },
          }) }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LanguageProvider initialLang={lang}>
          <AppStoreProvider>
            <CallProvider>
              <div className="contents animate-in fade-in duration-150">
                {children || <div>Loading...</div>}
              </div>
              <EmailSetupModal />
            </CallProvider>
          </AppStoreProvider>
        </LanguageProvider>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}` }} />
      </body>
    </html>
  )
}
