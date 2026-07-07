'use client'

import { useEffect, useRef, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const initialized = useRef(false)

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)qvor_theme=([^;]+)/)
    const stored = match?.[1] as Theme | undefined
    if (stored) setThemeState(stored)
    initialized.current = true
  }, [])

  useEffect(() => {
    if (!initialized.current) return
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.cookie = `qvor_theme=${theme}; path=/; sameSite=lax; max-age=${60 * 60 * 24 * 365}`
  }, [theme])

  return { theme, setTheme: setThemeState }
}
