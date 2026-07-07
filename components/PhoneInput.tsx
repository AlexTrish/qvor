'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useTranslation } from '@/hooks/useTranslation'

type Country = {
  code: string
  dial: string
  flag: string
  name: string
}

const COUNTRIES: Country[] = [
  { code: 'RU', dial: '7', flag: '🇷🇺', name: 'Россия' },
  { code: 'BY', dial: '375', flag: '🇧🇾', name: 'Беларусь' },
  { code: 'UA', dial: '380', flag: '🇺🇦', name: 'Украина' },
  { code: 'KZ', dial: '7', flag: '🇰🇿', name: 'Казахстан' },
  { code: 'UZ', dial: '998', flag: '🇺🇿', name: 'Узбекистан' },
  { code: 'US', dial: '1', flag: '🇺🇸', name: 'США' },
  { code: 'GB', dial: '44', flag: '🇬🇧', name: 'Великобритания' },
  { code: 'DE', dial: '49', flag: '🇩🇪', name: 'Германия' },
  { code: 'FR', dial: '33', flag: '🇫🇷', name: 'Франция' },
  { code: 'TR', dial: '90', flag: '🇹🇷', name: 'Турция' },
  { code: 'AE', dial: '971', flag: '🇦🇪', name: 'ОАЭ' },
  { code: 'ES', dial: '34', flag: '🇪🇸', name: 'Испания'},
]

type PhoneInputProps = {
  value: string
  onChange: (phone: string) => void
  disabled?: boolean
  error?: string | null
}

export function PhoneInput({ value, onChange, disabled, error }: PhoneInputProps) {
  const { t } = useTranslation()
  const [country, setCountry] = useState<Country>(() => {
    // Определяем страну по языку браузера
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('ru')) return COUNTRIES.find(c => c.code === 'RU') || COUNTRIES[0]
    if (lang.startsWith('uk')) return COUNTRIES.find(c => c.code === 'UA') || COUNTRIES[0]
    if (lang.startsWith('be')) return COUNTRIES.find(c => c.code === 'BY') || COUNTRIES[0]
    if (lang.startsWith('kk')) return COUNTRIES.find(c => c.code === 'KZ') || COUNTRIES[0]
    if (lang.startsWith('uz')) return COUNTRIES.find(c => c.code === 'UZ') || COUNTRIES[0]
    if (lang.startsWith('tr')) return COUNTRIES.find(c => c.code === 'TR') || COUNTRIES[0]
    if (lang.startsWith('de')) return COUNTRIES.find(c => c.code === 'DE') || COUNTRIES[0]
    if (lang.startsWith('fr')) return COUNTRIES.find(c => c.code === 'FR') || COUNTRIES[0]
    if (lang.startsWith('en')) return COUNTRIES.find(c => c.code === 'GB') || COUNTRIES[0]
    return COUNTRIES[0] // Россия по умолчанию
  })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Автоматическое определение страны по номеру
  useEffect(() => {
    if (value) {
      // Если номер начинается с кода страны, найти соответствующую страну
      for (const c of COUNTRIES) {
        if (value.startsWith(c.dial)) {
          setCountry(c)
          break
        }
      }
    }
  }, [value])

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search.replace('+', '')),
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCountryChange(newCountry: Country) {
    setCountry(newCountry)
    // При смене страны обновляем полный номер
    const numberPart = value.startsWith(country.dial) ? value.slice(country.dial.length) : value
    onChange(newCountry.dial + numberPart)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(country.dial + digits)
  }

  // Отображаем только часть номера без кода страны
  const displayValue = value.startsWith(country.dial) ? value.slice(country.dial.length) : value

  return (
    <div className="space-y-1.5">
      <div className="relative flex h-11 rounded-xl border border-border bg-background transition-all duration-150 focus-within:border-[--accent-brand] focus-within:ring-2 focus-within:ring-[--accent-brand]/20 dark:border-[oklch(1_0_0/20%)] dark:bg-[oklch(1_0_0/5%)]">
        {/* Селектор страны */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className="flex h-full items-center gap-1.5 rounded-l-xl border-r border-border px-3 text-sm transition-colors duration-150 hover:bg-muted/50 disabled:opacity-50"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-muted-foreground">+{country.dial}</span>
            <ChevronDown
              className={cn('size-3 text-muted-foreground transition-transform duration-150', open && 'rotate-180')}
              strokeWidth={2}
            />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg dark:border-[oklch(1_0_0/20%)]">
              <div className="p-2">
                <input
                  autoFocus
                  type="text"
                  placeholder={t('phone.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[--accent-brand] dark:border-[oklch(1_0_0/20%)] dark:bg-[oklch(1_0_0/5%)]"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { handleCountryChange(c); setOpen(false); setSearch('') }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 hover:bg-muted/50',
                      country.code === c.code && 'bg-[--accent-brand-muted] text-[--accent-brand]',
                    )}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 text-left">{c.name}</span>
                    <span className="text-muted-foreground">+{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Поле ввода */}
        <input
          type="tel"
          inputMode="numeric"
          placeholder="9991234567"
          value={displayValue}
          onChange={handleInput}
          disabled={disabled}
          maxLength={12}
          className="h-full flex-1 rounded-r-xl bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function usePhoneWithDial() {
  const [country, setCountry] = useState(COUNTRIES[0])
  const [number, setNumber] = useState('')

  const fullPhone = country.dial + number

  return { country, setCountry, number, setNumber, fullPhone }
}
