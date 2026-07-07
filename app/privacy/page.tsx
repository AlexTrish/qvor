'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { LegalPage } from '@/components/LegalPage'

export default function PrivacyPage() {
  const { t } = useTranslation()

  const sections = [
    { title: t('privacy.s1.title'), body: t('privacy.s1.body') },
    { title: t('privacy.s2.title'), body: t('privacy.s2.body') },
    { title: t('privacy.s3.title'), body: t('privacy.s3.body') },
    { title: t('privacy.s4.title'), body: t('privacy.s4.body') },
    { title: t('privacy.s5.title'), body: t('privacy.s5.body') },
    { title: t('privacy.s6.title'), body: t('privacy.s6.body') },
    { title: t('privacy.s7.title'), body: t('privacy.s7.body') },
    { title: t('privacy.s8.title'), body: t('privacy.s8.body') },
  ]

  return (
    <LegalPage
      titleKey="privacy.title"
      introKey="privacy.intro"
      ownerKey="privacy.owner"
      ownerTextKey="privacy.ownerText"
      sections={sections}
      updatedAt="15 мая 2026"
      contacts={[
        { label: 'Email', value: 'privacy@qvor.ru', href: 'mailto:privacy@qvor.ru' },
        { label: 'Роскомнадзор', value: 'rkn.gov.ru', href: 'https://rkn.gov.ru' },
      ]}
    />
  )
}
