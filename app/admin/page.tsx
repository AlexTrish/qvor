'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import { apiFetch } from '@/lib/api'
import {
  Shield, Users, MessageCircle, Hash, Wifi, Search,
  Trash2, ChevronLeft, ChevronRight, Crown, Ban, CheckCircle, Send, Clock, X, Flag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
type Stats = {
  users: number
  messages: number
  channels: number
  onlineUsers: number
  newUsersToday: number
  newMessagesToday: number
}

type AdminUser = {
  id: string
  numericId: number
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  role: 'USER' | 'SUPER_ADMIN'
  isOnline: boolean
  createdAt: string
  telegramId?: string | null
  bannedAt?: string | null
  _count: { sentMessages: number }
}

type AdminChannel = {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  isPrivate: boolean
  type: string
  category: string
  createdAt: string
  memberCount: number
  messageCount: number
  owner?: { id: string; username?: string | null; displayName?: string | null } | null
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex size-8 items-center justify-center rounded-xl bg-[--accent-brand-muted]">
          <Icon className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="font-[family-name:var(--font-syne)] text-2xl font-black tracking-tight">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

type Tab = 'users' | 'channels' | 'reports' | 'broadcast' | 'audit'

type AuditEntry = {
  id: string
  actorId: string
  actorName: string | null
  action: string
  targetType: string | null
  targetId: string | null
  createdAt: string
}

export default function AdminPage() {
  const { user, isAuthChecking } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')
  const [stats, setStats] = useState<Stats | null>(null)

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersPages, setUsersPages] = useState(1)
  const [usersQ, setUsersQ] = useState('')
  const [usersSearch, setUsersSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)

  // Channels state
  const [channels, setChannels] = useState<AdminChannel[]>([])
  const [channelsTotal, setChannelsTotal] = useState(0)
  const [channelsPage, setChannelsPage] = useState(1)
  const [channelsPages, setChannelsPages] = useState(1)
  const [channelsQ, setChannelsQ] = useState('')
  const [channelsSearch, setChannelsSearch] = useState('')
  const [channelsLoading, setChannelsLoading] = useState(false)

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditPages, setAuditPages] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null)

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Reports state
  type Report = {
    id: string; reporter_id: string; reporter_name: string | null; reporter_username: string | null
    target_type: string; target_id: string; reason: string; comment: string | null
    status: string; moderator_note: string | null; action_taken: string | null
    created_at: string; report_count: number
  }
  const [reports, setReports] = useState<Report[]>([])
  const [reportsTotal, setReportsTotal] = useState(0)
  const [reportsPage, setReportsPage] = useState(1)
  const [reportsPages, setReportsPages] = useState(1)
  const [reportsStatus, setReportsStatus] = useState('pending')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [resolveModal, setResolveModal] = useState<Report | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolveAction, setResolveAction] = useState('none')
  const [resolveLoading, setResolveLoading] = useState(false)

  useEffect(() => {
    if (!isAuthChecking && user && user.role !== 'SUPER_ADMIN') router.replace('/')
  }, [user, isAuthChecking, router])

  useEffect(() => {
    apiFetch('/api/admin/stats').then(r => r.json()).then(d => { if (d.data) setStats(d.data) })
  }, [])

  const loadUsers = useCallback(async (p = 1, query = usersSearch) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (query) params.set('q', query)
      const res = await apiFetch(`/api/admin/users?${params}`)
      const json = await res.json()
      setUsers(json.data ?? [])
      setUsersTotal(json.total ?? 0)
      setUsersPages(json.pages ?? 1)
      setUsersPage(p)
    } finally { setUsersLoading(false) }
  }, [usersSearch])

  const loadChannels = useCallback(async (p = 1, query = channelsSearch) => {
    setChannelsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (query) params.set('q', query)
      const res = await apiFetch(`/api/admin/channels?${params}`)
      const json = await res.json()
      setChannels(json.data ?? [])
      setChannelsTotal(json.total ?? 0)
      setChannelsPages(json.pages ?? 1)
      setChannelsPage(p)
    } finally { setChannelsLoading(false) }
  }, [channelsSearch])

  const loadAudit = useCallback(async (p = 1) => {
    setAuditLoading(true)
    try {
      const res = await apiFetch(`/api/admin/audit?page=${p}&limit=30`)
      const json = await res.json()
      setAuditLog(json.data ?? [])
      setAuditTotal(json.total ?? 0)
      setAuditPages(json.pages ?? 1)
      setAuditPage(p)
    } finally { setAuditLoading(false) }
  }, [])

  const loadReports = useCallback(async (p = 1, status = reportsStatus) => {
    setReportsLoading(true)
    try {
      const res = await apiFetch(`/api/admin/reports?status=${status}&page=${p}&limit=20`)
      const json = await res.json()
      setReports(json.data ?? [])
      setReportsTotal(json.total ?? 0)
      setReportsPages(json.pages ?? 1)
      setReportsPage(p)
    } finally { setReportsLoading(false) }
  }, [reportsStatus])

  async function resolveReport(status: 'resolved' | 'dismissed') {
    if (!resolveModal) return
    setResolveLoading(true)
    await apiFetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: resolveModal.id,
        status,
        moderatorNote: resolveNote.trim() || undefined,
        actionTaken: resolveAction,
      }),
    })
    setReports(prev => prev.filter(r => r.id !== resolveModal.id))
    setReportsTotal(v => v - 1)
    setResolveModal(null)
    setResolveNote('')
    setResolveAction('none')
    setResolveLoading(false)
  }

  useEffect(() => { if (user?.role === 'SUPER_ADMIN') loadUsers(1, usersSearch) }, [user?.role, usersSearch, loadUsers])
  useEffect(() => { if (user?.role === 'SUPER_ADMIN' && tab === 'channels') loadChannels(1, channelsSearch) }, [user?.role, tab, channelsSearch, loadChannels])
  useEffect(() => { if (user?.role === 'SUPER_ADMIN' && tab === 'audit') loadAudit(1) }, [user?.role, tab, loadAudit])
  useEffect(() => { if (user?.role === 'SUPER_ADMIN' && tab === 'reports') loadReports(1, reportsStatus) }, [user?.role, tab, reportsStatus, loadReports])

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastTitle.trim()) return
    setBroadcastSending(true)
    setBroadcastResult(null)
    const res = await apiFetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: broadcastTitle.trim(), body: broadcastBody.trim() || undefined }),
    })
    const json = await res.json()
    setBroadcastSending(false)
    setBroadcastResult(json.data ?? { sent: 0, failed: 0 })
    setBroadcastTitle('')
    setBroadcastBody('')
  }

  async function changeRole(id: string, role: 'USER' | 'SUPER_ADMIN') {
    setActionLoading(id)
    await apiFetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    setActionLoading(null)
  }

  async function toggleBan(u: AdminUser) {
    setActionLoading(u.id)
    if (u.bannedAt) {
      await apiFetch(`/api/admin/users/${u.id}/ban`, { method: 'DELETE' })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, bannedAt: null } : x))
    } else {
      await apiFetch(`/api/admin/users/${u.id}/ban`, { method: 'POST' })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, bannedAt: new Date().toISOString() } : x))
    }
    setActionLoading(null)
  }

  async function deleteUser(id: string) {
    if (!confirm(t('admin.deleteUser'))) return
    setActionLoading(id)
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
    setUsersTotal(v => v - 1)
    setActionLoading(null)
  }

  async function deleteChannel(id: string) {
    if (!confirm(t('admin.deleteChannel'))) return
    setActionLoading(id)
    await apiFetch(`/api/admin/channels/${id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    setChannelsTotal(v => v - 1)
    setActionLoading(null)
  }

  if (isAuthChecking || !user) return null
  if (user.role !== 'SUPER_ADMIN') return null

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex-1 overflow-y-auto mobile-pb">
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[--accent-brand-muted]">
              <Shield className="size-5 text-[--accent-brand]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-syne)] text-xl font-black tracking-tight">{t("admin.title")}</h1>
              <p className="text-xs text-muted-foreground">QVOR</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Users} label="Пользователи" value={stats.users} sub={`+${stats.newUsersToday} сегодня`} />
              <StatCard icon={MessageCircle} label="Сообщения" value={stats.messages} sub={`+${stats.newMessagesToday} сегодня`} />
              <StatCard icon={Hash} label="Каналы" value={stats.channels} />
              <StatCard icon={Wifi} label="Онлайн" value={stats.onlineUsers} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit flex-wrap">
            {(['users', 'channels', 'reports', 'broadcast', 'audit'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  tab === t ? 'bg-[--accent-brand] text-black' : 'text-muted-foreground hover:text-foreground',
                )}>
                {t === 'reports' ? (
                  <span className="flex items-center gap-1.5">
                    Жалобы
                    {reportsTotal > 0 && tab !== 'reports' && (
                      <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                        {reportsTotal > 9 ? '9+' : reportsTotal}
                      </span>
                    )}
                  </span>
                ) : ({ users: 'Пользователи', channels: 'Каналы', broadcast: 'Рассылка', audit: 'Аудит' }[t])}
              </button>
            ))}
          </div>

          {/* Users table */}
          {tab === 'users' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t("admin.users")}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{usersTotal} всего</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <input
                      value={usersQ}
                      onChange={e => setUsersQ(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') setUsersSearch(usersQ) }}
                      placeholder="Поиск..."
                      className="h-8 w-40 rounded-xl border border-border bg-background pl-8 pr-3 text-xs focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
                    />
                  </div>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {users.map(u => {
                    const name = u.displayName || u.username || `User ${u.numericId}`
                    const isMe = u.id === user.id
                    const isBanned = !!u.bannedAt
                    return (
                      <div key={u.id} className={cn('flex items-center gap-3 px-4 py-3', isBanned && 'opacity-60')}>
                        <div className="relative shrink-0">
                          <div className="size-9 overflow-hidden rounded-full bg-muted">
                            {u.avatarUrl
                              ? <Image src={u.avatarUrl} alt={name} width={36} height={36} className="size-full object-cover" />
                              : <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>
                            }
                          </div>
                          <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card', u.isOnline ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{name}</p>
                            {u.role === 'SUPER_ADMIN' && <Crown className="size-3 shrink-0 text-[--accent-brand]" strokeWidth={2} />}
                            {isBanned && <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">БАН</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            #{u.numericId}{u.username ? ` · @${u.username}` : ''} · {u._count.sentMessages} сообщ.
                          </p>
                        </div>
                        {!isMe && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={actionLoading === u.id}
                              onClick={() => changeRole(u.id, u.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN')}
                              className={cn(
                                'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-40',
                                u.role === 'SUPER_ADMIN'
                                  ? 'border-[--accent-brand]/30 bg-[--accent-brand-muted] text-[--accent-brand] hover:brightness-110'
                                  : 'border-border bg-background text-muted-foreground hover:border-[--accent-brand]/30 hover:text-[--accent-brand]',
                              )}
                            >
                              {u.role === 'SUPER_ADMIN' ? 'Admin' : 'User'}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === u.id}
                              onClick={() => toggleBan(u)}
                              title={isBanned ? t("admin.unban") : t("admin.ban")}
                              className={cn(
                                'flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
                                isBanned
                                  ? 'text-green-500 hover:bg-green-500/10'
                                  : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                              )}
                            >
                              {isBanned ? <CheckCircle className="size-3.5" strokeWidth={1.5} /> : <Ban className="size-3.5" strokeWidth={1.5} />}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === u.id}
                              onClick={() => deleteUser(u.id)}
                              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {usersPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <button type="button" disabled={usersPage <= 1} onClick={() => loadUsers(usersPage - 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </button>
                  <p className="text-xs text-muted-foreground">{usersPage} / {usersPages}</p>
                  <button type="button" disabled={usersPage >= usersPages} onClick={() => loadUsers(usersPage + 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Channels table */}
          {tab === 'channels' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t("admin.channels")}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{channelsTotal} всего</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <input
                      value={channelsQ}
                      onChange={e => setChannelsQ(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') setChannelsSearch(channelsQ) }}
                      placeholder="Поиск..."
                      className="h-8 w-40 rounded-xl border border-border bg-background pl-8 pr-3 text-xs focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
                    />
                  </div>
                </div>
              </div>

              {channelsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {channels.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                        {c.avatarUrl
                          ? <Image src={c.avatarUrl} alt={c.name} width={36} height={36} className="size-full object-cover" />
                          : <span className="text-sm font-bold text-muted-foreground">{(c.name || "?").charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-md',
                            c.isPrivate ? 'bg-muted text-muted-foreground' : 'bg-[--accent-brand-muted] text-[--accent-brand]',
                          )}>
                            {c.isPrivate ? t("admin.private2") : t("admin.public2")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.memberCount} участн. · {c.messageCount} сообщ.
                          {c.owner && ` · @${c.owner.username || c.owner.displayName || 'owner'}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={actionLoading === c.id}
                        onClick={() => deleteChannel(c.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 shrink-0"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                  {channels.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.noChannels")}</p>
                  )}
                </div>
              )}

              {channelsPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <button type="button" disabled={channelsPage <= 1} onClick={() => loadChannels(channelsPage - 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </button>
                  <p className="text-xs text-muted-foreground">{channelsPage} / {channelsPages}</p>
                  <button type="button" disabled={channelsPage >= channelsPages} onClick={() => loadChannels(channelsPage + 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {tab === 'reports' && (
            <div className="space-y-4">
              {/* Фильтр статуса */}
              <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
                {(['pending', 'reviewing', 'resolved', 'dismissed', 'all'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setReportsStatus(s)}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      reportsStatus === s ? 'bg-[--accent-brand] text-black' : 'text-muted-foreground hover:text-foreground')}>
                    {{
                      pending: 'Ожидают', reviewing: 'На рассмотрении',
                      resolved: 'Решены', dismissed: 'Отклонены', all: 'Все',
                    }[s]}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">Жалобы</h2>
                  <p className="text-xs text-muted-foreground">{reportsTotal} всего</p>
                </div>

                {reportsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <CheckCircle className="size-8 text-green-500" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground">Жалоб нет</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {reports.map(r => {
                      const REASON_LABELS: Record<string, string> = {
                        spam: 'Спам', harassment: 'Преследование',
                        illegal_content: 'Незаконный контент', csam: 'CSAM',
                        terrorism: 'Терроризм', fraud: 'Мошенничество',
                        malware: 'Вредоносное ПО', copyright: 'Авторские права',
                        misinformation: 'Дезинформация', other: 'Другое',
                      }
                      const isCritical = ['csam', 'terrorism'].includes(r.reason)
                      const TARGET_LABELS: Record<string, string> = { user: 'Пользователь', channel: 'Канал', message: 'Сообщение' }
                      return (
                        <div key={r.id} className={cn('px-4 py-3 space-y-2', isCritical && 'bg-destructive/5')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                                  isCritical ? 'bg-destructive text-white' : 'bg-[--accent-brand-muted] text-[--accent-brand]',
                                )}>
                                  {REASON_LABELS[r.reason] ?? r.reason}
                                </span>
                                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {TARGET_LABELS[r.target_type] ?? r.target_type}
                                </span>
                                {r.report_count > 1 && (
                                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                    {r.report_count} жалоб
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                От: <span className="font-medium text-foreground">{r.reporter_name ?? r.reporter_username ?? 'Аноним'}</span>
                                {' · '}
                                {new Date(r.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {r.comment && (
                                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 italic">«{r.comment}»</p>
                              )}
                              <p className="font-mono text-[10px] text-muted-foreground/60 truncate">ID: {r.target_id}</p>
                            </div>
                            {(r.status === 'pending' || r.status === 'reviewing') && (
                              <button type="button"
                                onClick={() => { setResolveModal(r); setResolveNote(''); setResolveAction('none') }}
                                className="shrink-0 rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-85 transition-all">
                                Рассмотреть
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {reportsPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <button type="button" disabled={reportsPage <= 1} onClick={() => loadReports(reportsPage - 1)}
                      className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                      <ChevronLeft className="size-4" strokeWidth={1.5} />
                    </button>
                    <p className="text-xs text-muted-foreground">{reportsPage} / {reportsPages}</p>
                    <button type="button" disabled={reportsPage >= reportsPages} onClick={() => loadReports(reportsPage + 1)}
                      className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                      <ChevronRight className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reports */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit flex-wrap">
                {(['pending', 'reviewing', 'resolved', 'dismissed', 'all'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setReportsStatus(s)}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      reportsStatus === s ? 'bg-[--accent-brand] text-black' : 'text-muted-foreground hover:text-foreground')}>
                    {({ pending: 'Ожидают', reviewing: 'На рассмотрении', resolved: 'Решены', dismissed: 'Отклонены', all: 'Все' } as Record<string,string>)[s]}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">Жалобы</h2>
                  <p className="text-xs text-muted-foreground">{reportsTotal} всего</p>
                </div>
                {reportsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <CheckCircle className="size-8 text-green-500" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground">Жалоб нет</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {reports.map(r => {
                      const REASON_LABELS: Record<string, string> = {
                        spam: 'Спам', harassment: 'Преследование',
                        illegal_content: 'Незаконный контент', csam: 'CSAM',
                        terrorism: 'Терроризм', fraud: 'Мошенничество',
                        malware: 'Вредоносное ПО', copyright: 'Авторские права',
                        misinformation: 'Дезинформация', other: 'Другое',
                      }
                      const TARGET_LABELS: Record<string, string> = {
                        user: 'Пользователь', channel: 'Канал', message: 'Сообщение',
                      }
                      const isCritical = ['csam', 'terrorism'].includes(r.reason)
                      return (
                        <div key={r.id} className={cn('px-4 py-3 space-y-2', isCritical && 'bg-destructive/5')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold',
                                  isCritical ? 'bg-destructive text-white' : 'bg-[--accent-brand-muted] text-[--accent-brand]')}>
                                  {REASON_LABELS[r.reason] ?? r.reason}
                                </span>
                                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {TARGET_LABELS[r.target_type] ?? r.target_type}
                                </span>
                                {r.report_count > 1 && (
                                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                    {r.report_count} жалоб
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                От: <span className="font-medium text-foreground">{r.reporter_name ?? r.reporter_username ?? 'Аноним'}</span>
                                {' · '}
                                {new Date(r.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {r.comment && (
                                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 italic">«{r.comment}»</p>
                              )}
                              <p className="font-mono text-[10px] text-muted-foreground/60 truncate">ID: {r.target_id}</p>
                            </div>
                            {(r.status === 'pending' || r.status === 'reviewing') && (
                              <button type="button"
                                onClick={() => { setResolveModal(r); setResolveNote(''); setResolveAction('none') }}
                                className="shrink-0 rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-85 transition-all">
                                Рассмотреть
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {reportsPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <button type="button" disabled={reportsPage <= 1} onClick={() => loadReports(reportsPage - 1)}
                      className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                      <ChevronLeft className="size-4" strokeWidth={1.5} />
                    </button>
                    <p className="text-xs text-muted-foreground">{reportsPage} / {reportsPages}</p>
                    <button type="button" disabled={reportsPage >= reportsPages} onClick={() => loadReports(reportsPage + 1)}
                      className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                      <ChevronRight className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Broadcast */}
          {tab === 'broadcast' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t("admin.broadcastTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Сообщение придёт всем пользователям в чат с <span className="font-medium text-foreground">@qvor</span></p>
              </div>
              <form onSubmit={sendBroadcast} className="p-4 space-y-3 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Заголовок</label>
                  <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="Системное сообщение" maxLength={200} required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Текст (необязательно)</label>
                  <textarea value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)}
                    placeholder="Подробности..." maxLength={4000} rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>

                {/* Превью */}
                {broadcastTitle.trim() && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Превью</p>
                    <p className="text-sm whitespace-pre-wrap">📢 {broadcastTitle.trim()}{broadcastBody.trim() ? `\n\n${broadcastBody.trim()}` : ''}</p>
                  </div>
                )}

                <button type="submit" disabled={broadcastSending || !broadcastTitle.trim()}
                  className="flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-85 disabled:opacity-40 transition-all active:scale-[0.97]">
                  {broadcastSending
                    ? <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    : <Send className="size-4" strokeWidth={2} />
                  }
                  {broadcastSending ? 'Отправка...' : 'Отправить всем'}
                </button>

                {/* Результат */}
                {broadcastResult && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <CheckCircle className="size-4 text-green-500 shrink-0" strokeWidth={2} />
                    <div>
                      <p className="text-sm font-medium">Рассылка завершена</p>
                      <p className="text-xs text-muted-foreground">
                        Доставлено: <span className="text-foreground font-medium">{broadcastResult.sent}</span>
                        {broadcastResult.failed > 0 && <> · Ошибок: <span className="text-destructive font-medium">{broadcastResult.failed}</span></>}
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Audit */}
          {tab === 'audit' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t("admin.auditTitle")}</h2>
              </div>
              {auditLoading ? (
                <div className="flex justify-center py-12">
                  <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                </div>
              ) : auditLog.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Clock className="size-8 text-muted-foreground" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">{t("admin.noEvents")}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLog.map(e => (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Clock className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          <span className="text-[--accent-brand]">{e.actorName ?? 'Admin'}</span>
                          {' → '}
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{e.action}</span>
                          {e.targetType && <span className="text-muted-foreground"> • {e.targetType}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(e.createdAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {auditPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <button type="button" disabled={auditPage <= 1} onClick={() => loadAudit(auditPage - 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </button>
                  <p className="text-xs text-muted-foreground">{auditPage} / {auditPages}</p>
                  <button type="button" disabled={auditPage >= auditPages} onClick={() => loadAudit(auditPage + 1)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-30">
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolve modal */}
          {resolveModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setResolveModal(null)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <p className="font-[family-name:var(--font-syne)] text-sm font-bold">Рассмотрение жалобы</p>
                  <button type="button" onClick={() => setResolveModal(null)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Причина:</span> <span className="font-medium">{resolveModal.reason}</span></p>
                    <p><span className="text-muted-foreground">Цель:</span> <span className="font-mono text-xs">{resolveModal.target_id}</span></p>
                    {resolveModal.comment && <p className="text-xs text-muted-foreground italic">«{resolveModal.comment}»</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Действие</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { id: 'none', label: 'Без действий' },
                        { id: 'warned', label: 'Предупреждение' },
                        { id: 'banned', label: 'Заблокировать' },
                        { id: 'deleted', label: 'Удалить контент' },
                      ] as const).map(a => (
                        <button key={a.id} type="button" onClick={() => setResolveAction(a.id)}
                          className={cn('rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                            resolveAction === a.id
                              ? (a.id === 'banned' || a.id === 'deleted'
                                  ? 'border-destructive bg-destructive/10 text-destructive'
                                  : 'border-[--accent-brand] bg-[--accent-brand-muted] text-[--accent-brand]')
                              : 'border-border text-muted-foreground hover:bg-muted/40')}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Заметка модератора</label>
                    <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                      placeholder="Причина решения..." maxLength={500} rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => resolveReport('dismissed')} disabled={resolveLoading}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all disabled:opacity-50">
                      Отклонить
                    </button>
                    <button type="button" onClick={() => resolveReport('resolved')} disabled={resolveLoading}
                      className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background hover:opacity-85 transition-all disabled:opacity-50">
                      {resolveLoading ? 'Сохраняем...' : 'Принять решение'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}
