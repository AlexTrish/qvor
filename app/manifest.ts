import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QVOR — Безопасный мессенджер',
    short_name: 'QVOR',
    description: 'Бесплатный защищённый мессенджер с end-to-end шифрованием',
    start_url: '/messages',
    scope: '/',
    display: 'standalone',
    background_color: '#0c0c0c',
    theme_color: '#f59e0b',
    orientation: 'portrait-primary',
    lang: 'ru',
    dir: 'ltr',
    categories: ['social', 'communication', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: 'Сообщения',
        short_name: 'Чаты',
        description: 'Открыть список чатов',
        url: '/messages',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
