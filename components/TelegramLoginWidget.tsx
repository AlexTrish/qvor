'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function TelegramLoginWidget() {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !ref.current || !botUsername) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).onTelegramAuth = async (user: TelegramUser) => {
      const res = await fetch('/api/auth/telegram-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      const json = await res.json()

      if (res.ok) {
        router.push('/')
        return
      }

      if (json.error === 'TELEGRAM_NOT_BOUND') {
        const params = new URLSearchParams({
          telegramId: String(json.meta.telegramId),
          firstName: json.meta.firstName,
          ...(json.meta.username && { username: json.meta.username }),
        })
        router.push(`/register?telegram=${params.toString()}`)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?23'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    ref.current.appendChild(script)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onTelegramAuth
    }
  }, [mounted, botUsername, router])

  if (!mounted) return null

  if (!botUsername) return null

  return <div ref={ref} className="flex justify-center" />
}
