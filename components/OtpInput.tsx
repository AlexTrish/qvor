'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type OtpInputProps = {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
}

export function OtpInput({ length = 6, onComplete, disabled }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...values]
    next[index] = value.slice(-1)
    setValues(next)
    if (value && index < length - 1) refs.current[index + 1]?.focus()
    const code = next.join('')
    if (code.length === length) onComplete(code)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const next = [...values]
    pasted.split('').forEach((char, i) => { next[i] = char })
    setValues(next)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
    if (pasted.length === length) onComplete(pasted)
  }

  return (
    <div className="flex gap-2 justify-center">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            'h-14 w-11 rounded-xl border bg-background text-center text-xl font-bold',
            'transition-all duration-150',
            'focus:outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20',
            val ? 'border-[--accent-brand] text-[--accent-brand]' : 'border-border text-foreground dark:border-[oklch(1_0_0/25%)]',
            'disabled:opacity-40',
          )}
        />
      ))}
    </div>
  )
}
