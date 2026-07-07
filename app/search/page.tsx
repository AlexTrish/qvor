'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import { apiFetch } from '@/lib/api'
import { Search, Hash, User, MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

type UserResult = {
  id: string
  numericId: number
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  isOnline: boolean
}

type ChannelResult = {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  memberCount: number
}

export default function SearchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [users, setUsers] = useState<UserResult[]>([])
  const [channels, setChannels] = useState<ChannelResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const query = q.trim()
    if (!query) { setUsers([]); setChannels([]); setSearched(false); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`)
        const json = await res.json()
        setUsers(json.data?.users ?? [])
        setChannels(json.data?.channels ?? [])
        setSearched(true)
      } finally { setLoading(false) }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  const empty = searched && !loading && users.length === 0 && channels.length === 0

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex-1 overflow-y-auto mobile-pb">
        <div className="mx-auto max-w-xl px-4 py-4 space-y-4">

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
            {loading && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
            )}
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Поиск пользователей, каналов или #хэштега..."
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
            />
          </div>

          {/* Empty state */}
          {!q.trim() && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Search className="size-7 text-muted-foreground" strokeWidth={1} />
              </div>
              <p className="text-sm font-medium">{t("search.title")}</p>
              <p className="text-xs text-muted-foreground">{t("search.subtitle")}</p>
            </div>
          )}

          {empty && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Search className="size-7 text-muted-foreground" strokeWidth={1} />
              </div>
              <p className="text-sm font-medium">{t("search.empty")}</p>
              <p className="text-xs text-muted-foreground">{t("search.emptyDesc")}</p>
            </div>
          )}

          {/* Users */}
          {users.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <User className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("search.users")}</p>
              </div>
              <div className="divide-y divide-border">
                {users.map(u => {
                  const name = u.displayName || u.username || `User ${u.numericId}`
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="relative shrink-0">
                        <div className="size-10 overflow-hidden rounded-full bg-muted">
                          {u.avatarUrl
                            ? <Image src={u.avatarUrl} alt={name} width={40} height={40} className="size-full object-cover" />
                            : <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>
                          }
                        </div>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', u.isOnline ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{u.username ? `@${u.username}` : `#${u.numericId}`}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={u.username ? `/${u.username}` : `/id${u.numericId}`}
                          className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:border-[--accent-brand]/30 hover:text-[--accent-brand]">
                          <User className="size-3.5" strokeWidth={1.5} />
                        </Link>
                        <button type="button" onClick={() => router.push(`/messages?id=${u.id}`)}
                          className="flex size-8 items-center justify-center rounded-xl bg-[--accent-brand-muted] text-[--accent-brand] transition-all hover:brightness-110">
                          <MessageCircle className="size-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Channels */}
          {channels.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <Hash className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("search.channels")}</p>
              </div>
              <div className="divide-y divide-border">
                {channels.map(c => (
                  <Link key={c.id} href={`/channels/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted]">
                      {c.avatarUrl
                        ? <Image src={c.avatarUrl} alt={c.name} width={40} height={40} className="size-full rounded-full object-cover" />
                        : <Hash className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" strokeWidth={1.5} />
                        <span>{c.memberCount}</span>
                        {c.description && <span className="truncate">· {c.description}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
