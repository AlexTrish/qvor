'use client'

import { useTranslation } from '@/hooks/useTranslation'

type Props = {
  isOnline: boolean
  lastSeenAt?: string | null
  size?: 'sm' | 'md'
}

function formatLastSeen(iso: string, lang: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (diffMin < 1) return lang === 'ru' ? 'только что' : 'just now'
  if (diffMin < 60) return lang === 'ru' ? `${diffMin} мин назад` : `${diffMin}m ago`
  if (diffHours < 24 && isToday) return lang === 'ru' ? `сегодня в ${time}` : `today at ${time}`
  if (isYesterday) return lang === 'ru' ? `вчера в ${time}` : `yesterday at ${time}`

  const dateStr = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
  })
  return lang === 'ru' ? `${dateStr} в ${time}` : `${dateStr} at ${time}`
}

export function OnlineStatus({ isOnline, lastSeenAt, size = 'sm' }: Props) {
  const { t, lang } = useTranslation()

  const dotSize = size === 'md' ? 'size-2.5' : 'size-2'
  const textSize = size === 'md' ? 'text-sm' : 'text-xs'

  const label = isOnline
    ? t('profile.online')
    : lastSeenAt
    ? (lang === 'ru' ? `Был в сети ${formatLastSeen(lastSeenAt, lang)}` : `Last seen ${formatLastSeen(lastSeenAt, lang)}`)
    : t('profile.offline')

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex shrink-0">
        <span className={[
          dotSize,
          'rounded-full',
          isOnline ? 'bg-green-500' : 'bg-[oklch(0.6_0_0)]',
        ].join(' ')} />
        {isOnline && (
          <span className={[
            dotSize,
            'absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60',
          ].join(' ')} />
        )}
      </span>
      <span className={[
        textSize,
        isOnline ? 'text-green-500' : 'text-muted-foreground',
      ].join(' ')}>
        {label}
      </span>
    </div>
  )
}
