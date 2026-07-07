'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import defaultEn from '@/translations/default/en.json'
import defaultRu from '@/translations/default/ru.json'
import type { TranslationPack } from '@/lib/i18n'

type LanguageContextValue = {
  lang: string
  pack: TranslationPack
  ready: boolean
  setLanguage: (lang: string) => void
  t: (key: string, vars?: Record<string, string>, fallback?: string) => string
}

const defaultPacks: Record<string, TranslationPack> = {
  en: defaultEn as unknown as TranslationPack,
  ru: defaultRu as unknown as TranslationPack,
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ initialLang, children }: { initialLang: string; children: React.ReactNode }) {
  const [lang, setLang] = useState(initialLang ?? 'en')
  const [pack, setPack] = useState<TranslationPack>(defaultPacks[initialLang] ?? defaultEn)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cookieValue = `qvor_lang=${lang}; path=/; sameSite=lax`
    document.cookie = cookieValue
  }, [lang])

  useEffect(() => {
    const localPack = defaultPacks[lang]
    if (localPack) {
      setPack(localPack)
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)

    fetch(`/api/i18n/pack/${encodeURIComponent(lang)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.data) {
          setPack(json.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPack(defaultEn as unknown as TranslationPack)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      pack,
      ready,
      setLanguage: setLang,
      t: (key: string, vars?: Record<string, string>, fallback?: string) => {
        let str = pack[key] ?? fallback ?? key
        if (vars) {
          Object.entries(vars).forEach(([k, v]) => {
            str = str.replaceAll(`{${k}}`, v ?? '')
          })
        }
        return str ?? ''
      },
    }),
    [lang, pack, ready]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguageContext() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider')
  }
  return context
}
