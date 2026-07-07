'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { SettingsModal } from '@/components/SettingsModal'
import {
  MessageCircle, ChevronRight,
  User, Users, DoorOpen, Settings, Plus, Search, Bell, Trash2, X as XIcon, Shield,
  LogOut,
} from 'lucide-react'
import { NotificationsCenter } from '@/components/NotificationsCenter'
import { useSSE } from '@/hooks/useSSE'

import { apiFetch } from '@/lib/api'
import { AuthModal } from '@/components/AuthModal'
import { cn } from '@/lib/utils'
import { OnlineStatus } from '@/components/OnlineStatus'
import { useAppStore } from '@/hooks/useAppStore'

// ─── Types ───────────────────────────────────────────────────────────────────

type SavedAccount = {
  id: string
  displayName?: string | null
  username?: string | null
  avatarUrl?: string | null
  numericId?: number
}

// ─── Centered modal overlay ──────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ─── Profile modal ───────────────────────────────────────────────────────────

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const [showAccounts, setShowAccounts] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [addLoginOpen, setAddLoginOpen] = useState(false)

  const showOnlineDot = user?.isOnline && !user?.hideOnline

  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem('qvor_accounts')
      const accounts: SavedAccount[] = raw ? JSON.parse(raw) : []
      if (user && !accounts.find(a => a.id === user.id)) {
        const updated = [{ id: user.id, displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl, numericId: user.numericId }, ...accounts]
        localStorage.setItem('qvor_accounts', JSON.stringify(updated))
        setSavedAccounts(updated)
      } else {
        setSavedAccounts(accounts)
      }
    } catch { setSavedAccounts([]) }
  }, [open, user])

  const displayName = user?.displayName || user?.username || `User ${user?.numericId}`
  const initials = (displayName || "?").charAt(0).toUpperCase()

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="size-14 overflow-hidden rounded-full bg-muted">
                {user?.avatarUrl
                  ? <Image src={user.avatarUrl} alt={displayName} width={56} height={56} className="size-full object-cover" />
                  : <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground">{initials}</div>
                }
              </div>
              <span className={cn('absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-background', showOnlineDot ? 'bg-green-500' : 'bg-muted-foreground/40')} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-syne)] text-sm font-black tracking-tight truncate">{displayName}</p>
              {user?.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
              <OnlineStatus isOnline={user?.isOnline ?? false} lastSeenAt={user?.lastSeenAt} size="sm" />
            </div>
            <button type="button" onClick={() => setShowAccounts(v => !v)}
              className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-all">
              <ChevronRight className={cn('size-4 transition-transform duration-200', showAccounts && 'rotate-90')} strokeWidth={1.5} />
            </button>
          </div>

          {showAccounts && (
            <div className="rounded-xl border border-border overflow-hidden">
              {savedAccounts.filter(a => a.id !== user?.id).map(acc => {
                const name = acc.displayName || acc.username || `User ${acc.numericId}`
                return (
                  <div key={acc.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="size-8 overflow-hidden rounded-full bg-muted shrink-0">
                      {acc.avatarUrl
                        ? <Image src={acc.avatarUrl} alt={name} width={32} height={32} className="size-full object-cover" />
                        : <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{name}</p>
                      {acc.username && <p className="text-[10px] text-muted-foreground">@{acc.username}</p>}
                    </div>
                  </div>
                )
              })}
              <button type="button" onClick={() => { onClose(); setAddLoginOpen(true) }}
                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors border-t border-border text-left">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted shrink-0">
                  <Plus className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium">{t("nav.comingSoon")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("nav.comingSoon")}</p>
                </div>
              </button>
            </div>
          )}

          <div className="h-px bg-border" />
          <Link href="/profile" onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-muted/50">
            <User className="size-4 text-muted-foreground" strokeWidth={1.5} />
            {t("nav.openProfile")}
          </Link>
          {user?.role === 'SUPER_ADMIN' && (
            <Link href="/admin" onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-[--accent-brand-muted] text-[--accent-brand]">
              <Shield className="size-4" strokeWidth={1.5} />
              {t("nav.adminPanel")}
            </Link>
          )}

          <div className="h-px bg-border" />
          <button type="button" onClick={() => { onClose(); logout() }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10">
            <LogOut className="size-4" strokeWidth={1.5} />
            {t('nav.logout')}
          </button>
        </div>
      </Modal>
      <AuthModal open={addLoginOpen} onClose={() => setAddLoginOpen(false)} title={t('nav.addAccount')} />
    </>
  )
}

// ─── Contacts modal ───────────────────────────────────────────────────────────

function ContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Users className="size-6 text-muted-foreground" strokeWidth={1} />
        </div>
        <p className="text-sm font-medium">Контакты</p>
        <p className="text-xs text-muted-foreground">{t("nav.comingSoon")}</p>
        <button type="button" onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-all">
          {t("nav.close")}
        </button>
      </div>
    </Modal>
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────

// Desktop sidebar — полный набор (без каналов)
const DESKTOP_NAV_ITEMS = [
  { id: 'messages',  href: '/messages', icon: MessageCircle, labelKey: 'nav.messages' },
  { id: 'search',    href: '/search',   icon: Search,        labelKey: 'nav.search' },
] as const

// Mobile hotbar — Messages, Search, Profile
const MOBILE_NAV_ITEMS = [
  { id: 'messages', href: '/messages', icon: MessageCircle, labelKey: 'nav.messages' },
  { id: 'search',   href: '/search',   icon: Search,        labelKey: 'nav.search' },
] as const

function useNavActive() {
  const pathname = usePathname()
  return (href: string) => {
    if (href === '/messages' && pathname === '/messages') return true
    if (href !== '/messages' && pathname.startsWith(href.split('?')[0])) return true
    return false
  }
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar() {
  const [expanded, setExpanded] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isActive = useNavActive()
  const { user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const { refreshConversations, conversations } = useAppStore()

  const unreadMessages = conversations.filter(c => (c.unreadCount ?? 0) > 0).length

  function prefetch(href: string) {
    router.prefetch(href)
    if (href.startsWith('/messages')) refreshConversations()
  }

  const showOnlineDot = user?.isOnline && !user?.hideOnline

  const displayName = user?.displayName || user?.username || `User ${user?.numericId}`
  const initials = (displayName || "?").charAt(0).toUpperCase()
  const navItems = DESKTOP_NAV_ITEMS

  return (
    <>
      <div className="hidden md:flex items-start py-4 pl-4 shrink-0">
        <aside className={cn(
          'relative flex flex-col rounded-2xl border border-border bg-background shadow-sm transition-all duration-200 ease-out overflow-visible',
          expanded ? 'w-48' : 'w-12',
        )}>
          <div className="flex flex-1 flex-col overflow-hidden rounded-t-2xl">
            {/* Avatar */}
            <div className={cn('border-b border-border/60', expanded ? 'px-2 py-2' : 'flex justify-center py-2.5')}>
              <button type="button" onClick={() => setProfileOpen(true)}
                className={cn('flex items-center rounded-xl transition-all hover:bg-muted/40', expanded ? 'w-full gap-2.5 px-2 py-1.5' : 'justify-center p-1')}>
                <div className="relative shrink-0">
                  <div className="size-8 overflow-hidden rounded-full bg-muted">
                    {user?.avatarUrl
                      ? <Image src={user.avatarUrl} alt={displayName} width={32} height={32} className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">{initials}</div>
                    }
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background', showOnlineDot ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                </div>
                {expanded && (
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-semibold leading-tight">{displayName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{user?.username ? `@${user.username}` : `#${user?.numericId}`}</p>
                  </div>
                )}
              </button>
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-0.5 px-1.5 py-2">
              {navItems.map(item => {
                const active = isActive(item.href)
                return (
                  <Link key={item.id} href={item.href} title={!expanded ? t(item.labelKey) : undefined}
                    onMouseEnter={() => prefetch(item.href)}
                    className={cn('flex items-center rounded-xl transition-all duration-150', expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5',
                      active ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}>
                    <div className="relative shrink-0">
                      <item.icon className="size-4" strokeWidth={active ? 2 : 1.5} />
                      {item.id === 'messages' && unreadMessages > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[--accent-brand]" />
                      )}
                    </div>
                    {expanded && <span className="text-xs font-medium flex-1">{t(item.labelKey)}</span>}
                    {expanded && item.id === 'messages' && unreadMessages > 0 && (
                      <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                )
              })}

              {/* Contacts */}
              <button type="button" onClick={() => setContactsOpen(true)} title={!expanded ? t('nav.contacts') : undefined}
                className={cn('flex items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-muted/40 hover:text-foreground', expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2.5')}>
                <Users className="size-4 shrink-0" strokeWidth={1.5} />
                {expanded && <span className="text-xs font-medium">{t('nav.contacts')}</span>}
              </button>

              {/* Notifications */}
              <NotificationsCenter sidebarExpanded={expanded} />
            </nav>

            {/* Bottom */}
            <div className="border-t border-border/60 px-1.5 py-2 space-y-0.5">
              <button type="button" onClick={() => setSettingsOpen(true)}
                title={!expanded ? t('nav.settings') : undefined}
                className={cn('flex w-full items-center rounded-xl transition-all duration-150 text-muted-foreground hover:bg-muted/40 hover:text-foreground', expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center py-2')}>
                <Settings className="size-4 shrink-0" strokeWidth={1.5} />
                {expanded && <span className="text-xs font-medium flex-1 text-left">{t('nav.settings')}</span>}
              </button>
              {expanded && <p className="px-2.5 pt-1 text-[10px] text-muted-foreground/50 tracking-wide text-center">QVOR v0.2.7</p>}
            </div>
          </div>

          <button type="button" onClick={() => setExpanded(v => !v)}
            className="flex items-center justify-center border-t border-border/60 py-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground rounded-b-2xl">
            <ChevronRight className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-180')} strokeWidth={1.5} />
          </button>
        </aside>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ContactsModal open={contactsOpen} onClose={() => setContactsOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

// ─── Mobile notifications bottom sheet ──────────────────────────────────────

type MobileNotif = { id: string; type: string; title: string; body?: string | null; read: boolean; createdAt: string }

function MobileNotifSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [notifs, setNotifs] = useState<MobileNotif[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiFetch('/api/notifications?limit=30').then(r => r.json()).then(d => setNotifs(d.data ?? [])).finally(() => setLoading(false))
  }, [open])

  async function markAll() {
    await apiFetch('/api/notifications', { method: 'PATCH' })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function del(id: string) {
    await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  if (!open) return null

  const TYPE_ICONS: Record<string, string> = { message: '💬', reaction: '❤️', friend_request: '👤', channel_invite: '#', follow: '👤' }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[75vh] flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background"
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <p className="font-[family-name:var(--font-syne)] text-base font-bold">Уведомления</p>
          <div className="flex items-center gap-2">
            {notifs.some(n => !n.read) && (
              <button type="button" onClick={markAll}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-[--accent-brand] hover:bg-[--accent-brand-muted] transition-colors">
                {t("nav.markAllRead")}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50">
              <XIcon className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">{t("nav.comingSoon")}</p>
            </div>
          ) : notifs.map(n => (
            <div key={n.id}
              className={cn('flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors', !n.read && 'bg-[--accent-brand-muted]/40')}>
              <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm', !n.read ? 'bg-[--accent-brand] text-black' : 'bg-muted')}>
                {TYPE_ICONS[n.type] ?? '🔔'}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm leading-tight', !n.read ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                {n.body && <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>}
              </div>
              <button type="button" onClick={() => del(n.id)}
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-3" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile bottom hotbar ─────────────────────────────────────────────────────

function MobileHotbar({ chatOpen = false }: { chatOpen?: boolean }) {
  const isActive = useNavActive()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { conversations } = useAppStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const unreadMobile = conversations.filter(c => (c.unreadCount ?? 0) > 0).length

  // Счётчик уведомлений через SSE — без поллинга
  useSSE({
    notif: (data: any) => {
      if (typeof data?.unreadCount === 'number') setUnread(data.unreadCount)
      else setUnread(v => v + 1)
    },
  })

  const showOnlineDot = user?.isOnline && !user?.hideOnline
  const displayName = user?.displayName || user?.username || `User ${user?.numericId}`
  const initials = (displayName || '?').charAt(0).toUpperCase()
  const navItems = MOBILE_NAV_ITEMS

  if (chatOpen) return null

  const hotbarStyle = {
    background: 'color-mix(in oklch, var(--background) 85%, transparent)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
    boxShadow: '0 4px 24px oklch(0 0 0 / 10%), inset 0 1px 0 oklch(1 0 0 / 8%)',
  }

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden">
        <div className="mx-3 mb-2 overflow-hidden rounded-2xl" style={hotbarStyle}>
          <div className="flex items-center justify-around px-2" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))', paddingTop: '0.375rem' }}>

            {/* Nav links */}
            {navItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link key={item.id} href={item.href}
                  className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-90 min-w-[3rem]', active ? 'text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                  <div className="relative">
                    <item.icon className="size-5 shrink-0" strokeWidth={active ? 2.5 : 1.5} />
                    {item.id === 'messages' && unreadMobile > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[--accent-brand]" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}

            {/* Notifications */}
            <button type="button" onClick={() => setNotifsOpen(true)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:bg-muted/40 transition-all active:scale-90 min-w-[3rem]">
              <div className="relative">
                <Bell className="size-5" strokeWidth={1.5} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[--accent-brand]" />
                )}
              </div>
              <span className="text-[10px] font-medium">Увед.</span>
            </button>

            {/* Settings */}
            <button type="button" onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:bg-muted/40 transition-all active:scale-90 min-w-[3rem]">
              <Settings className="size-5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium">Настр.</span>
            </button>

            {/* Profile */}
            <button type="button" onClick={() => setProfileOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:bg-muted/40 transition-all active:scale-90 min-w-[3rem]">
              <div className="relative">
                <div className="size-5 overflow-hidden rounded-full bg-muted">
                  {user?.avatarUrl
                    ? <Image src={user.avatarUrl} alt={displayName} width={20} height={20} className="size-full object-cover" />
                    : <div className="flex size-full items-center justify-center text-[8px] font-bold text-muted-foreground">{initials}</div>
                  }
                </div>
                {showOnlineDot && <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-background bg-green-500" />}
              </div>
              <span className="text-[10px] font-medium">Проф.</span>
            </button>

          </div>
        </div>
      </nav>

      <MobileNotifSheet open={notifsOpen} onClose={() => setNotifsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function AppNav({ chatOpen = false }: { chatOpen?: boolean }) {
  return (
    <>
      <DesktopSidebar />
      <MobileHotbar chatOpen={chatOpen} />
    </>
  )
}
