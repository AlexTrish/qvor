'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { LegalPage } from '@/components/LegalPage'

export default function ModerationPage() {
  const { t } = useTranslation()

  const sections = [
    { title: t('moderation.s1.title'), body: t('moderation.s1.body') },
    { title: t('moderation.s2.title'), body: t('moderation.s2.body') },
    { title: t('moderation.s3.title'), body: t('moderation.s3.body') },
    { title: t('moderation.s4.title'), body: t('moderation.s4.body') },
    { title: t('moderation.s5.title'), body: t('moderation.s5.body') },
  ]

  return (
    <LegalPage
      titleKey="moderation.title"
      introKey="moderation.intro"
      sections={sections}
      updatedAt="15 мая 2026"
      contacts={[
        { label: 'Жалобы', value: 'abuse@qvor.ru', href: 'mailto:abuse@qvor.ru' },
        { label: 'Апелляции', value: 'appeal@qvor.ru', href: 'mailto:appeal@qvor.ru' },
      ]}
    />
  )
}
