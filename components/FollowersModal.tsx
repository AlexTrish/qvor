'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import Image from 'next/image'
import Link from 'next/link'
import { UserPlus, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { OnlineStatus } from '@/components/OnlineStatus'
import { cn } from '@/lib/utils'

type FollowUser = {
  id: string
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  isOnline: boolean
  lastSeenAt?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  currentUserId?: string
  initialTab?: 'followers' | 'following'
}

export function FollowersModal({ open, onClose, userId, currentUserId, initialTab = 'followers' }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    setLoadingFollowers(true)
    fetch(`/api/users/${userId}/follow/list`)
      .then(r => r.json())
      .then(d => setFollowers(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingFollowers(false))
  }, [open, userId])

  useEffect(() => {
    if (!open) return
    setLoadingFollowing(true)
    fetch(`/api/users/${userId}/follow/following`)
      .then(r => r.json())
      .then(d => setFollowing(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingFollowing(false))
  }, [open, userId])

  // Загружаем на кого подписан текущий пользователь
  useEffect(() => {
    if (!open || !currentUserId) return
    fetch(`/api/users/${currentUserId}/follow/following`)
      .then(r => r.json())
      .then(d => {
        const ids = new Set<string>((d.data ?? []).map((u: FollowUser) => u.id))
        setMyFollowing(ids)
      })
      .catch(() => {})
  }, [open, currentUserId])

  async function handleFollow(targetId: string) {
    if (pending.has(targetId)) return
    setPending(prev => new Set(prev).add(targetId))
    try {
      if (myFollowing.has(targetId)) {
        await fetch(`/api/users/${targetId}/follow`, { method: 'DELETE' })
        setMyFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s })
      } else {
        await fetch(`/api/users/${targetId}/follow`, { method: 'POST' })
        setMyFollowing(prev => new Set(prev).add(targetId))
      }
    } finally {
      setPending(prev => { const s = new Set(prev); s.delete(targetId); return s })
    }
  }

  const list = tab === 'followers' ? followers : following
  const isLoading = tab === 'followers' ? loadingFollowers : loadingFollowing

  function UserRow({ u }: { u: FollowUser }) {
    const name = u.displayName || u.username || 'User'
    const href = u.username ? `/${u.username}` : `/id${u.id}`
    const isMe = u.id === currentUserId
    const isFollowing = myFollowing.has(u.id)
    const isPending = pending.has(u.id)

    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <Link href={href} onClick={onClose} className="relative shrink-0">
          <div className="size-10 overflow-hidden rounded-full bg-muted">
            {u.avatarUrl ? (
              <Image src={u.avatarUrl} alt={name} width={40} height={40} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                {(name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {u.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-green-500" />
          )}
        </Link>

        <Link href={href} onClick={onClose} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {u.username && <p className="truncate text-xs text-muted-foreground">@{u.username}</p>}
          <OnlineStatus isOnline={u.isOnline} lastSeenAt={u.lastSeenAt ?? null} size="sm" />
        </Link>

        {!isMe && currentUserId && (
          <button
            type="button"
            onClick={() => handleFollow(u.id)}
            disabled={isPending}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50',
              isFollowing
                ? 'border border-border bg-card text-muted-foreground hover:border-destructive/40 hover:text-destructive'
                : 'bg-[--accent-brand] text-black hover:brightness-110',
            )}
          >
            {isPending ? (
              <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
            ) : isFollowing ? (
              <><Check className="size-3" strokeWidth={2.5} /> Подписан</>
            ) : (
              <><UserPlus className="size-3" strokeWidth={2} /> Подписаться</>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm rounded-2xl border-border bg-card p-0 shadow-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button type="button" onClick={() => setTab('followers')}
            className={cn(
              'flex-1 py-3.5 text-sm font-semibold transition-colors',
              tab === 'followers' ? 'border-b-2 border-[--accent-brand] text-[--accent-brand]' : 'text-muted-foreground hover:text-foreground',
            )}>
            <DialogTitle className="inline">Подписчики</DialogTitle>
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{followers.length}</span>
          </button>
          <button type="button" onClick={() => setTab('following')}
            className={cn(
              'flex-1 py-3.5 text-sm font-semibold transition-colors',
              tab === 'following' ? 'border-b-2 border-[--accent-brand] text-[--accent-brand]' : 'text-muted-foreground hover:text-foreground',
            )}>
            Подписки
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{following.length}</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <UserPlus className="size-8 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">
                {tab === "followers" ? t("profile.noFollowers") : t("profile.noFollowing")}
              </p>
            </div>
          ) : (
            list.map(u => <UserRow key={u.id} u={u} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
