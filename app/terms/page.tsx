'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { LegalPage } from '@/components/LegalPage'

export default function TermsPage() {
  const { t } = useTranslation()

  const sections = [
    { title: t('terms.s1.title'), body: t('terms.s1.body') },
    { title: t('terms.s2.title'), body: t('terms.s2.body') },
    { title: t('terms.s3.title'), body: t('terms.s3.body') },
    { title: t('terms.s4.title'), body: t('terms.s4.body') },
    { title: t('terms.s5.title'), body: t('terms.s5.body') },
    { title: t('terms.s6.title'), body: t('terms.s6.body') },
    { title: t('terms.s7.title'), body: t('terms.s7.body') },
  ]

  return (
    <LegalPage
      titleKey="terms.title"
      introKey="terms.intro"
      ownerKey="terms.owner"
      ownerTextKey="terms.ownerText"
      sections={sections}
      updatedAt="15 мая 2026"
      contacts={[
        { label: 'Email', value: 'legal@qvor.ru', href: 'mailto:legal@qvor.ru' },
        { label: 'Сайт', value: 'qvor.ru', href: 'https://qvor.ru' },
      ]}
    />
  )
}
