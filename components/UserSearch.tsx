'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslation } from '@/hooks/useTranslation'
import { OnlineStatus } from '@/components/OnlineStatus'
import { Search, X } from 'lucide-react'

type SearchUser = {
  id: string
  numericId: number
  username?: string
  displayName?: string
  avatarUrl?: string
  isOnline: boolean
  lastSeenAt?: string | null
}

type Props = {
  onSelect: (user: SearchUser) => void
  onClose: () => void
}

export function UserSearch({ onSelect, onClose }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        const json = await res.json()
        setResults(json.data ?? [])
      } catch {}
      finally { setLoading(false) }
    }, 300)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="button" onClick={onClose}
          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center p-4">
            <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
          </div>
        )}
        {!loading && query && results.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">{t('search.noResults')}</p>
        )}
        {results.map(user => {
          const name = user.displayName || user.username || `User ${user.numericId}`
          return (
            <button key={user.id} type="button" onClick={() => onSelect(user)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
              <div className="relative shrink-0">
                <div className="size-10 overflow-hidden rounded-full border border-border bg-card">
                  {user.avatarUrl
                    ? <Image src={user.avatarUrl} alt={name} width={40} height={40} className="size-full object-cover" />
                    : <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>
                  }
                </div>
                {user.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-green-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <div className="flex items-center gap-1.5">
                  {user.username && <span className="text-xs text-muted-foreground">@{user.username}</span>}
                  <span className="text-xs text-muted-foreground">#{user.numericId}</span>
                </div>
                <OnlineStatus isOnline={user.isOnline} lastSeenAt={user.lastSeenAt} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
