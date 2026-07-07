'use client'

import { useLanguageContext } from '@/app/components/LanguageProvider'

export function useTranslation() {
  const { lang, t, ready, setLanguage } = useLanguageContext()
  return { lang, t, ready, setLanguage }
}
