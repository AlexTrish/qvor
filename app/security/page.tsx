'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { LegalPage } from '@/components/LegalPage'

export default function SecurityPage() {
  const { t } = useTranslation()

  const sections = [
    { title: t('security.s1.title'), body: t('security.s1.body') },
    { title: t('security.s2.title'), body: t('security.s2.body') },
    { title: t('security.s3.title'), body: t('security.s3.body') },
    { title: t('security.s4.title'), body: t('security.s4.body') },
    { title: t('security.s5.title'), body: t('security.s5.body') },
    { title: t('security.s6.title'), body: t('security.s6.body') },
  ]

  return (
    <LegalPage
      titleKey="security.title"
      introKey="security.intro"
      sections={sections}
      updatedAt="15 мая 2026"
      contacts={[
        { label: 'Security', value: 'security@qvor.ru', href: 'mailto:security@qvor.ru' },
      ]}
    />
  )
}
