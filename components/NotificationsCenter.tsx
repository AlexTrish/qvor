'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Bell, Check, Trash2, MessageCircle, Heart, UserPlus, Hash, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSSE } from '@/hooks/useSSE'

type Notification = {
  id: string
  type: string
  title: string
  body?: string | null
  read: boolean
  createdAt: string
  data?: Record<string, unknown> | null
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  message: MessageCircle,
  reaction: Heart,
  friend_request: UserPlus,
  channel_invite: Hash,
  follow: UserPlus,
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

export function NotificationsCenter({ inline = false, onOpen, sidebarExpanded }: { inline?: boolean; onOpen?: () => void; sidebarExpanded?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useSSE({
    notif: (data: any) => {
      if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount)
      else setUnreadCount(prev => prev + 1)
    },
  })

  // Счётчик приходит через SSE при подключении — отдельный запрос не нужен

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=30')
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } catch {}
    finally { setLoading(false) }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function deleteNotification(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    const n = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (n && !n.read) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  function handleOpen() {
    setOpen(v => !v)
    if (!open) fetchNotifications()
  }

  return (
    <div ref={ref} className="relative w-full">
      {inline ? (
        <div className="relative flex size-4 items-center justify-center" onClick={onOpen}>
          <Bell className="size-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-[--accent-brand] text-[8px] font-bold text-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      ) : sidebarExpanded !== undefined ? (
        // Режим сайдбара — кнопка в стиле nav-item
        <button type="button" onClick={handleOpen}
          className={cn(
            'flex w-full items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            sidebarExpanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5',
            open && 'bg-[--accent-brand-muted] text-[--accent-brand]',
          )}>
          <div className="relative shrink-0">
            <Bell className="size-4" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[--accent-brand]" />
            )}
          </div>
          {sidebarExpanded && (
            <>
              <span className="text-xs font-medium flex-1 text-left">Уведомления</span>
              {unreadCount > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      ) : (
        <button type="button" onClick={handleOpen}
          className={cn(
            'relative flex size-8 items-center justify-center rounded-xl transition-all',
            open ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          )}>
          <Bell className="size-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[--accent-brand] text-[9px] font-bold text-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
            onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Уведомления</p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead}
                  className="flex items-center gap-1 rounded-xl px-2 py-1 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
                  <Check className="size-3" strokeWidth={2} /> Все прочитаны
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                className="flex size-6 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground">
                <X className="size-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="size-8 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                return (
                  <div key={n.id}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30',
                      !n.read && 'bg-[--accent-brand-muted]/30',
                    )}
                    onClick={() => !n.read && markRead(n.id)}>
                    <div className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                      !n.read ? 'bg-[--accent-brand] text-black' : 'bg-muted text-muted-foreground',
                    )}>
                      <Icon className="size-4" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-medium leading-tight', !n.read && 'font-semibold')}>{n.title}</p>
                      {n.body && <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                      className="mt-0.5 hidden size-6 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex">
                      <Trash2 className="size-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
