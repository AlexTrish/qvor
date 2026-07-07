'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { LegalPage } from '@/components/LegalPage'

export default function CookiesPage() {
  const { t } = useTranslation()

  const sections = [
    { title: t('cookies.s1.title'), body: t('cookies.s1.body') },
    { title: t('cookies.s2.title'), body: t('cookies.s2.body') },
    { title: t('cookies.s3.title'), body: t('cookies.s3.body') },
    { title: t('cookies.s4.title'), body: t('cookies.s4.body') },
  ]

  return (
    <LegalPage
      titleKey="cookies.title"
      introKey="cookies.intro"
      sections={sections}
      updatedAt="15 мая 2026"
      contacts={[
        { label: 'Email', value: 'privacy@qvor.ru', href: 'mailto:privacy@qvor.ru' },
      ]}
    />
  )
}
