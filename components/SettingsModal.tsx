'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Settings, Monitor, Moon, Sun, Check, ChevronDown, ChevronRight,
  Lock, MessageCircle, Shield, Palette, Home, Eye, EyeOff, Trash2, ArrowLeft, Bell, BellOff, Download, Smartphone, MonitorSmartphone,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { i18nApi, apiFetch } from '@/lib/api'
import { usePush } from '@/hooks/usePush'

type Pack = { id: string; title: string; source: 'default' | 'custom' }
type Section = 'root' | 'appearance' | 'privacy' | 'security' | 'notifications' | 'sessions' | 'email'
type HomePage = 'messages' | 'profile' | 'contacts' | 'favorites' | 'settings'
type PrivacyValue = 'nobody' | 'contacts' | 'everyone'
type PrivacySettings = {
  whoCanSeeLastSeen: PrivacyValue
  whoCanSeeBio: PrivacyValue
  whoCanSeePhone: PrivacyValue
  whoCanAddToGroups: PrivacyValue
}

const HOME_OPTIONS: { value: HomePage; label: string }[] = [
  { value: 'messages',  label: 'Сообщения' },
  { value: 'profile',   label: 'Профиль' },
  { value: 'contacts',  label: 'Контакты' },
  { value: 'favorites', label: 'Избранное' },
  { value: 'settings',  label: 'Настройки' },
]

const PRIVACY_OPTIONS: { value: PrivacyValue; label: string }[] = [
  { value: 'everyone', label: 'Все' },
  { value: 'contacts', label: 'Контакты' },
  { value: 'nobody',   label: 'Никто' },
]

const DEFAULT_PRIVACY: PrivacySettings = {
  whoCanSeeLastSeen: 'everyone',
  whoCanSeeBio: 'everyone',
  whoCanSeePhone: 'contacts',
  whoCanAddToGroups: 'everyone',
}

const THEMES = [
  { id: 'light',  labelKey: 'settings.themeLight',  icon: Sun },
  { id: 'dark',   labelKey: 'settings.themeDark',   icon: Moon },
  { id: 'system', labelKey: 'settings.themeSystem', icon: Monitor },
] as const

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown<T extends string>({
  value, options, onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ElementType }[]
  onChange: (v: T, e: React.MouseEvent) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [openUp, setOpenUp] = useState(false)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setOpenUp(window.innerHeight - rect.bottom < 180)
    }
    setOpen(v => !v)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-all hover:border-[--accent-brand]/40 focus:outline-none dark:bg-[oklch(1_0_0/5%)] dark:border-[oklch(1_0_0/20%)]"
      >
        <span className="flex items-center gap-2">
          {current?.icon && <current.icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />}
          <span>{current?.label}</span>
        </span>
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform duration-150', open && 'rotate-180')} strokeWidth={2} />
      </button>
      {open && (
        <div className={cn(
          'absolute left-0 right-0 z-[200] overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          openUp ? 'bottom-full mb-1' : 'top-full mt-1',
        )}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { onChange(opt.value, e); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                opt.value === value ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-foreground hover:bg-muted/40',
              )}
            >
              {opt.icon && <opt.icon className="size-3.5 shrink-0" strokeWidth={1.5} />}
              <span className="flex-1 text-left">{opt.label}</span>
              {opt.value === value && <Check className="size-3.5" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn('relative h-6 w-11 rounded-full transition-colors duration-200', checked ? 'bg-[--accent-brand]' : 'bg-muted')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ icon: Icon, label, desc, right, onClick, danger }: {
  icon?: React.ElementType
  label: string
  desc?: string
  right?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        onClick && 'hover:bg-muted/40 active:bg-muted/60',
        danger && 'text-destructive',
      )}
    >
      {Icon && (
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', danger ? 'bg-destructive/10' : 'bg-muted')}>
          <Icon className={cn('size-4', danger ? 'text-destructive' : 'text-muted-foreground')} strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', danger && 'text-destructive')}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {right ?? (onClick && !danger && <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />)}
    </Tag>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="mx-4 h-px bg-border" />
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Sessions section ─────────────────────────────────────────────────────────
type SessionItem = { id: string; device: string; ip: string | null; lastActiveAt: string; createdAt: string }

function SessionsSection({ userId: _userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/sessions', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setSessions(j.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function terminate(id: string) {
    setTerminating(id)
    await fetch(`/api/auth/sessions?id=${id}`, { method: 'DELETE', credentials: 'include' })
    setSessions(prev => prev.filter(s => s.id !== id))
    setTerminating(null)
  }

  async function terminateAll() {
    setTerminating('all')
    await fetch('/api/auth/sessions?all=1', { method: 'DELETE', credentials: 'include' })
    setSessions(prev => prev.slice(0, 1))
    setTerminating(null)
  }

  function formatDevice(ua: string) {
    if (/iPhone|iPad/.test(ua)) return '📱 iOS'
    if (/Android/.test(ua)) return '📱 Android'
    if (/Windows/.test(ua)) return '💻 Windows'
    if (/Mac/.test(ua)) return '💻 macOS'
    if (/Linux/.test(ua)) return '💻 Linux'
    return '💻 Браузер'
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-1">
      {sessions.length > 1 && (
        <div className="px-4 pb-2">
          <button type="button" onClick={terminateAll} disabled={terminating === 'all'}
            className="w-full rounded-xl border border-destructive/30 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50">
            {terminating === 'all' ? 'Завершаем...' : 'Завершить все другие сессии'}
          </button>
        </div>
      )}
      {sessions.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Сессий нет</p>}
      {sessions.map((s, i) => (
        <div key={s.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
            {formatDevice(s.device).split(' ')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{formatDevice(s.device)}</p>
            <p className="text-xs text-muted-foreground truncate">{s.device.slice(0, 60)}</p>
            {s.ip && <p className="text-xs text-muted-foreground">{s.ip}</p>}
            <p className="text-xs text-muted-foreground">
              {i === 0 ? 'Текущая сессия' : `Активно: ${new Date(s.lastActiveAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          {i > 0 && (
            <button type="button" onClick={() => terminate(s.id)} disabled={terminating === s.id}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
              {terminating === s.id
                ? <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                : <Trash2 className="size-3.5" strokeWidth={1.5} />}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function SettingsModal({ open: externalOpen, onClose }: { open?: boolean; onClose?: () => void } = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (externalOpen !== undefined) { if (!v) onClose?.() }
    else setInternalOpen(v)
  }

  const [section, setSection] = useState<Section>('root')
  const { theme, setTheme } = useTheme()
  const { lang, t, setLanguage } = useTranslation()
  const { user, logout, refreshUser, deleteAccount } = useAuth()
  const push = usePush()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [homePage, setHomePageState] = useState<HomePage>('messages')
  const [hideOnline, setHideOnlineState] = useState(false)
  const [privacy, setPrivacyState] = useState<PrivacySettings>(DEFAULT_PRIVACY)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'code'>('input')
  const [emailSending, setEmailSending] = useState(false)
  const [notifSettings, setNotifSettings] = useState({
    messages: true,
    reactions: true,
    mentions: true,
    friendRequests: true,
    channelInvites: true,
  })
  const [packs, setPacks] = useState<Pack[]>([
    { id: 'en', title: 'English', source: 'default' },
    { id: 'ru', title: 'Русский', source: 'default' },
  ])

  useEffect(() => {
    if (open) {
      setSection('root')
      setConfirmDelete(false)
      setHideOnlineState(user?.hideOnline ?? false)
      const ps = user?.privacySettings as PrivacySettings | null
      setPrivacyState(ps ? { ...DEFAULT_PRIVACY, ...ps } : DEFAULT_PRIVACY)
      const m = document.cookie.match(/(?:^|;\s*)qvor_home=([^;]+)/)
      setHomePageState((m?.[1] as HomePage) ?? 'messages')
      i18nApi.getPacks().then(r => { if (r.data) setPacks(r.data) })
      try {
        const saved = localStorage.getItem('qvor_notif_settings')
        if (saved) setNotifSettings(prev => ({ ...prev, ...JSON.parse(saved) }))
      } catch {}
    }
  }, [open, user?.hideOnline, user?.privacySettings])

  async function toggleHideOnline() {
    const next = !hideOnline
    setHideOnlineState(next)
    await apiFetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hideOnline: next }),
    })
    await refreshUser()
  }

  function setHomePage(v: HomePage) {
    setHomePageState(v)
    document.cookie = `qvor_home=${v}; path=/; sameSite=lax; max-age=${60 * 60 * 24 * 365}`
  }

  async function savePrivacy(next: PrivacySettings) {
    setPrivacyState(next)
    setPrivacySaving(true)
    await apiFetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacySettings: next }),
    })
    await refreshUser()
    setPrivacySaving(false)
  }

  const handleSetTheme = useCallback((id: string, e: React.MouseEvent) => {
    document.documentElement.style.setProperty('--vt-origin-x', `${e.clientX}px`)
    document.documentElement.style.setProperty('--vt-origin-y', `${e.clientY}px`)
    setTheme(id as 'light' | 'dark' | 'system')
  }, [setTheme])

  const themeOptions = THEMES.map(({ id, labelKey, icon }) => ({ value: id as 'light' | 'dark' | 'system', label: t(labelKey), icon }))
  const langOptions = packs.map(p => ({ value: p.id, label: p.title }))

  const title = section === 'root' ? t('settings.title')
    : section === 'appearance' ? t('settings.appearance')
    : section === 'privacy' ? t('settings.privacy')
    : section === 'notifications' ? t('settings.notifications')
    : section === 'sessions' ? t('settings.activeSessions')
    : section === 'email' ? 'Email'
    : t('settings.security')

  async function sendEmailCode() {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) return
    setEmailSending(true)
    const res = await apiFetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, lang }),
    })
    setEmailSending(false)
    if (res.ok) setEmailStep('code')
  }

  async function verifyEmailCode() {
    if (!emailCode || emailCode.length !== 6) return
    setEmailSending(true)
    const res = await apiFetch('/api/users/me/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, code: emailCode }),
    })
    setEmailSending(false)
    if (res.ok) {
      await refreshUser()
      setSection('security')
      setEmailInput('')
      setEmailCode('')
      setEmailStep('input')
    }
  }

  async function removeEmail() {
    await apiFetch('/api/users/me/email', { method: 'DELETE' })
    await refreshUser()
    setSection('security')
  }

  return (
    <>
      {externalOpen === undefined && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground active:scale-95"
          aria-label={t('common.settings')}
        >
          <Settings className="size-4" strokeWidth={1.5} />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card p-0 shadow-xl overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
            {section !== 'root' && (
              <button type="button" onClick={() => setSection('root')}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">
                <ArrowLeft className="size-4" strokeWidth={1.5} />
              </button>
            )}
            <DialogTitle className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight flex-1">
              {title}
            </DialogTitle>
          </div>

          <div className="py-2">

            {/* ── Root ── */}
            {section === 'root' && (
              <>
                <SectionLabel>{t('settings.interface')}</SectionLabel>
                <Row icon={Palette} label={t('settings.appearance')} desc={`${t(`settings.theme${(theme || 'system').charAt(0).toUpperCase() + theme.slice(1)}` as never)} · ${langOptions.find(l => l.value === lang)?.label}`} onClick={() => setSection('appearance')} />

                {user && (
                  <>
                    <Divider />
                    <SectionLabel>{t('settings.account')}</SectionLabel>
                    <Row icon={Eye} label={t('settings.privacy')} desc={`${t('settings.whoSees')} ваши данные`} onClick={() => setSection('privacy')} />
                    <Row icon={Bell} label={t('settings.notifications')} desc="Настройка типов уведомлений" onClick={() => setSection('notifications')} />
                    <Row icon={Lock} label={t('settings.security')} desc="Пароль, Telegram, удаление" onClick={() => setSection('security')} />
                    <Divider />
                    <SectionLabel>{t('settings.session')}</SectionLabel>
                    <Row icon={Shield} label="Выйти" desc={user.username ? `@${user.username}` : `#${user.numericId}`} onClick={() => { setOpen(false); logout() }} danger />
                  </>
                )}

                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-muted-foreground/50 tracking-wide">QVOR v0.2.0</p>
                </div>
              </>
            )}

            {/* ── Appearance ── */}
            {section === 'appearance' && (
              <>
                <SectionLabel>Тема</SectionLabel>
                <div className="px-4 pb-2">
                  <Dropdown value={theme} options={themeOptions} onChange={(v, e) => handleSetTheme(v, e)} />
                </div>

                <SectionLabel>Язык</SectionLabel>
                <div className="px-4 pb-2">
                  <Dropdown value={lang} options={langOptions} onChange={(v) => setLanguage(v)} />
                </div>

                {user && (
                  <>
                    <SectionLabel>{t("settings.defaultPage")}</SectionLabel>
                    <div className="px-4 pb-2">
                      <Dropdown value={homePage} options={HOME_OPTIONS} onChange={(v) => setHomePage(v)} />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Notifications ── */}
            {section === 'notifications' && user && (
              <>
                {push.supported && (
                  <>
                    <SectionLabel>Push-уведомления</SectionLabel>
                    <Row
                      icon={push.subscribed ? Bell : BellOff}
                      label="Push-уведомления"
                      desc={push.subscribed ? t('settings.pushEnabled') : t('settings.pushDisabled')}
                      right={<Toggle checked={push.subscribed} onChange={push.subscribed ? push.unsubscribe : push.subscribe} />}
                    />
                    <Divider />
                  </>
                )}
                <SectionLabel>{t("settings.notifTypes")}</SectionLabel>
                {([
                  { key: 'messages',      label: 'Новые сообщения',    desc: 'Личные сообщения от пользователей' },
                  { key: 'reactions',     label: 'Реакции',              desc: 'Когда кто-то реагирует на ваше сообщение' },
                  { key: 'mentions',      label: 'Упоминания',            desc: 'Когда вас упомянули через @' },
                  { key: 'friendRequests', label: 'Заявки в друзья',   desc: 'Новые заявки на дружбу' },
                  { key: 'channelInvites', label: 'Приглашения в каналы', desc: 'Приглашения вступить в канал' },
                ] as { key: keyof typeof notifSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <Row
                    key={key}
                    label={label}
                    desc={desc}
                    right={
                      <Toggle
                        checked={notifSettings[key]}
                        onChange={() => {
                          const next = { ...notifSettings, [key]: !notifSettings[key] }
                          setNotifSettings(next)
                          // Сохраняем в localStorage
                          try { localStorage.setItem('qvor_notif_settings', JSON.stringify(next)) } catch {}
                        }}
                      />
                    }
                  />
                ))}
              </>
            )}

            {/* ── Privacy ── */}
            {section === 'privacy' && user && (
              <>
                <SectionLabel>{t("settings.visibility")}</SectionLabel>
                <Row
                  icon={hideOnline ? EyeOff : Eye}
                  label="Скрыть онлайн-статус"
                  desc="Другие не увидят, что вы в сети"
                  right={<Toggle checked={hideOnline} onChange={toggleHideOnline} />}
                />
                <Divider />
                <SectionLabel>{t("settings.whoSees")}</SectionLabel>
                {([
                  { key: 'whoCanSeeLastSeen', label: 'Последний вход' },
                  { key: 'whoCanSeeBio',      label: 'Биография' },
                  { key: 'whoCanSeePhone',    label: 'Номер телефона' },
                  { key: 'whoCanAddToGroups', label: 'Добавление в группы' },
                ] as { key: keyof PrivacySettings; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="px-4 py-2">
                    <p className="mb-1.5 text-sm font-medium">{label}</p>
                    <Dropdown
                      value={privacy[key]}
                      options={PRIVACY_OPTIONS}
                      onChange={(v) => savePrivacy({ ...privacy, [key]: v })}
                    />
                  </div>
                ))}
                {privacySaving && <p className="px-4 py-2 text-xs text-muted-foreground">{t("settings.saving")}</p>}
              </>
            )}

            {/* ── Security ── */}
            {section === 'security' && user && (
              <>
                <SectionLabel>{t("settings.account")}</SectionLabel>
                <Row
                  icon={MessageCircle}
                  label="Telegram"
                  desc={user.telegramId ? t('settings.telegramConnected') : t('settings.telegramNotConnected')}
                  right={
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', user.telegramId ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground')}>
                      {user.telegramId ? '✓' : '—'}
                    </span>
                  }
                />
                <Row
                  label="Email"
                  desc={user.email || 'Не привязан'}
                  onClick={() => setSection('email' as Section)}
                />
                <Row
                  icon={Lock}
                  label="Сменить пароль"
                  desc={t('settings.recoveryDesc')}
                  onClick={() => { setOpen(false); window.location.href = '/recover' }}
                />
                <Divider />
                <SectionLabel>Опасная зона</SectionLabel>
                <Row
                  icon={Download}
                  label="Экспорт данных"
                  desc={t('settings.exportData')}
                  onClick={() => window.open('/api/users/me/export', '_blank')}
                />
                <Row
                  icon={Smartphone}
                  label={t('settings.addDevice')}
                  desc={t('settings.addDeviceDesc')}
                  onClick={() => { setOpen(false); window.location.href = '/device-link' }}
                />
                <Row
                  icon={Monitor}
                  label={t('settings.activeSessions')}
                  desc={t('settings.activeSessionsDesc')}
                  onClick={() => setSection('sessions' as Section)}
                />
                <Divider />
                {!confirmDelete ? (
                  <Row icon={Trash2} label={`${t('settings.delete')} аккаунт`} desc="Все данные будут удалены безвозвратно" onClick={() => setConfirmDelete(true)} danger />
                ) : (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-destructive">{t('settings.deleteAccountConfirm')}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setOpen(false); deleteAccount() }}
                        className="flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all">
                        {t("settings.delete")}
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)}
                        className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-all">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {section === 'sessions' && user && (
              <SessionsSection userId={user.id} />
            )}

            {/* ── Email ── */}
            {section === 'email' && user && (
              <>
                {user.email ? (
                  <>
                    <SectionLabel>Текущий email</SectionLabel>
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium mb-1">{user.email}</p>
                      <p className="text-xs text-muted-foreground mb-3">Подтверждённый email для восстановления доступа</p>
                      <button type="button" onClick={removeEmail}
                        className="w-full rounded-xl border border-destructive/30 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                        Удалить email
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <SectionLabel>Добавить email</SectionLabel>
                    {emailStep === 'input' ? (
                      <div className="px-4 py-3 space-y-3">
                        <p className="text-xs text-muted-foreground">Для восстановления доступа и получения кодов авторизации</p>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          placeholder="example@mail.com"
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
                        />
                        <button type="button" onClick={sendEmailCode} disabled={emailSending || !emailInput}
                          className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-85 transition-all disabled:opacity-50">
                          {emailSending ? 'Отправляем...' : 'Отправить код'}
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 space-y-3">
                        <p className="text-xs text-muted-foreground">Код отправлен на {emailInput}</p>
                        <input
                          type="text"
                          value={emailCode}
                          onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-center font-mono tracking-widest focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
                        />
                        <button type="button" onClick={verifyEmailCode} disabled={emailSending || emailCode.length !== 6}
                          className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-85 transition-all disabled:opacity-50">
                          {emailSending ? 'Проверяем...' : 'Подтвердить'}
                        </button>
                        <button type="button" onClick={() => setEmailStep('input')}
                          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                          Изменить email
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
