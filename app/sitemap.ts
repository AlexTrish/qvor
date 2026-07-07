import type { MetadataRoute } from 'next'

const BASE = 'https://qvor.ru'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
      alternates: {
        languages: {
          ru: `${BASE}/`,
          en: `${BASE}/?lang=en`,
        },
      },
    },
    {
      url: `${BASE}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          ru: `${BASE}/login`,
          en: `${BASE}/login?lang=en`,
        },
      },
    },
    {
      url: `${BASE}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          ru: `${BASE}/register`,
          en: `${BASE}/register?lang=en`,
        },
      },
    },
    {
      url: `${BASE}/recover`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
      alternates: {
        languages: {
          ru: `${BASE}/privacy`,
          en: `${BASE}/privacy?lang=en`,
        },
      },
    },
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
      alternates: {
        languages: {
          ru: `${BASE}/terms`,
          en: `${BASE}/terms?lang=en`,
        },
      },
    },
  ]
}
