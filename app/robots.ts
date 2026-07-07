import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/recover', '/privacy', '/terms'],
        disallow: [
          '/api/',
          '/messages',
          '/channels',
          '/profile',
          '/friends',
          '/search',
          '/onboarding',
          '/id',
        ],
      },

      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: 'https://qvor.ru/sitemap.xml',
    host: 'https://qvor.ru',
  }
}
