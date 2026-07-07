'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useTranslation } from '@/hooks/useTranslation'
import { UserSearch } from '@/components/UserSearch'
import { Search, Plus, Star, Archive, Pin, PinOff, Trash2, FolderPlus, X, Check, Hash, Users, MessageCircle, MailOpen, CheckCheck } from 'lucide-react'
import { ConversationSkeleton } from '@/components/Skeletons'
import type { Conversation } from '@/hooks/useMessages'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
// ─── Create Folder Modal ──────────────────────────────────────────────────────

const FILTER_ICONS_MODAL = { filterUnread: MailOpen, filterChannels: Hash, filterContacts: Users, filterGroups: MessageCircle }

function CreateFolderModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, emoji: string, filters: Record<string, boolean>) => Promise<void>
}) {
  const { t } = useTranslation()
  const FILTER_LABELS_MODAL: Record<string, string> = {
    filterUnread: t('folder.filterUnread'),
    filterChannels: t('folder.filterChannels'),
    filterContacts: t('folder.filterContacts'),
    filterGroups: t('folder.filterGroups'),
  }
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [filters, setFilters] = useState({ filterUnread: false, filterChannels: false, filterContacts: false, filterGroups: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(''); setEmoji('📁')
    setFilters({ filterUnread: false, filterChannels: false, filterContacts: false, filterGroups: false })
  }, [open])

  useEffect(() => {
    if (!open) return
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try { await onCreate(name.trim(), emoji, filters) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight">Новый раздел</p>
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2}
              className="w-12 rounded-xl border border-border bg-muted/30 px-2 py-2.5 text-center text-lg outline-none focus:border-[--accent-brand]" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Название раздела"
              autoFocus
              className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Фильтры</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS_MODAL) as (keyof typeof filters)[]).map(key => {
                const Icon = FILTER_ICONS_MODAL[key as keyof typeof FILTER_ICONS_MODAL]
                const active = filters[key]
                return (
                  <button key={key} type="button"
                    onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                      active ? 'bg-[--accent-brand] text-black' : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}>
                    <Icon className="size-3" strokeWidth={1.5} />
                    {FILTER_LABELS_MODAL[key]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
              Отмена
            </button>
            <button type="button" onClick={handleCreate} disabled={!name.trim() || saving}
              className="flex-1 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 transition-all disabled:opacity-40">
              {saving ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create Channel Modal ──────────────────────────────────────────────────────

function CreateChannelModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, description: string, isPrivate: boolean) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(''); setDescription(''); setIsPrivate(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try { await onCreate(name.trim(), description.trim(), isPrivate) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight">Новый канал</p>
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Мой канал"
              className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="О чём этот канал..." rows={3}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className={cn('flex size-5 items-center justify-center rounded-md border-2 transition-all', isPrivate ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border')} onClick={() => setIsPrivate(v => !v)}>
              {isPrivate && <Check className="size-3 text-black" strokeWidth={3} />}
            </div>
            <div>
              <p className="text-sm font-medium">Приватный канал</p>
              <p className="text-xs text-muted-foreground">Только по приглашению</p>
            </div>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
              Отмена
            </button>
            <button type="button" onClick={handleCreate} disabled={!name.trim() || saving}
              className="flex-1 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 transition-all disabled:opacity-40">
              {saving ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(''); setDescription('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try { await onCreate(name.trim(), description.trim()) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight">Новая группа</p>
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Моя группа"
              className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="О чём эта группа..." rows={3}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
              Отмена
            </button>
            <button type="button" onClick={handleCreate} disabled={!name.trim() || saving}
              className="flex-1 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 transition-all disabled:opacity-40">
              {saving ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type SearchUser = { id: string; numericId: number; username?: string | null; displayName?: string | null; avatarUrl?: string | null; isOnline: boolean }
type SearchChannel = { id: string; name: string; avatarUrl?: string | null; memberCount: number; isPrivate: boolean }
type GroupItem = { id: string; name: string; avatarUrl?: string | null; isPrivate: boolean; type: string; memberCount: number; unreadCount?: number; lastMessage?: string | null; lastMessageSenderName?: string | null; lastMessageAt?: string | null }

type ChatFolder = {
  id: string
  name: string
  emoji?: string | null
  position: number
  filterUnread: boolean
  filterChannels: boolean
  filterContacts: boolean
  filterGroups: boolean
  chats: { peerId: string; pinned: boolean }[]
}

type ConversationListProps = {
  conversations: Conversation[]
  selectedUserId?: string
  selectedChannelId?: string
  onSelectConversation: (userId: string) => void
  onSelectChannel?: (channelId: string) => void
  onNewChat: (userId: string) => void
  loading?: boolean
  currentUserId?: string
  typingUsers?: Set<string>
}

export function ConversationList({
  conversations, selectedUserId, selectedChannelId, onSelectConversation, onSelectChannel, onNewChat, loading, currentUserId, typingUsers,
}: ConversationListProps) {
  const { t, lang } = useTranslation()
  const [mainTab, setMainTab] = useState<'chats' | 'channels'>('chats')
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [channels, setChannels] = useState<GroupItem[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<{ users: SearchUser[]; channels: SearchChannel[] } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | 'all' | 'archive'>('all')
  const [folders, setFolders] = useState<ChatFolder[]>([])
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ peerId: string; x: number; y: number } | null>(null)
  const [previewChat, setPreviewChat] = useState<Conversation | null>(null)
  const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([])
  const contextRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    apiFetch('/api/folders').then(r => r.json()).then(d => setFolders(d.data ?? []))
    apiFetch('/api/channels').then(r => r.json()).then(d => {
      const all: GroupItem[] = d.data ?? []
      setGroups(all.filter((g: GroupItem) => g.type === 'GROUP'))
      setChannels(all.filter((g: GroupItem) => g.type === 'CHANNEL'))
    })
  }, [])

  useEffect(() => {
    if (mainTab !== 'channels' || channels.length > 0) return
    setChannelsLoading(true)
    apiFetch('/api/channels').then(r => r.json()).then(d => {
      const all: GroupItem[] = d.data ?? []
      setChannels(all.filter((g: GroupItem) => g.type === 'CHANNEL'))
    }).finally(() => setChannelsLoading(false))
  }, [mainTab])

  // Батч-поиск с debounce — ищем всегда по API (новые пользователи + каналы)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) { setSearchResults(null); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const json = await res.json()
        if (json.data) setSearchResults(json.data)
      } finally { setSearchLoading(false) }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  useEffect(() => {
    if (activeFolder === 'archive') {
      apiFetch('/api/conversations?archived=1').then(r => r.json()).then(d => setArchivedConvs(d.data ?? []))
    }
  }, [activeFolder])

  useEffect(() => {
    if (!contextMenu) return
    function h(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [contextMenu])

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays === 0) return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return t('time.yesterday')
    if (diffDays < 7) return date.toLocaleDateString(lang, { weekday: 'short' })
    return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' })
  }

  async function setChatState(peerId: string, data: Record<string, unknown>) {
    await apiFetch('/api/chat-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, peerType: 'user', ...data }),
    })
  }

  async function archiveChat(peerId: string) {
    await setChatState(peerId, { archived: true })
    setContextMenu(null)
    // Refresh — parent will reload conversations
    window.dispatchEvent(new CustomEvent('reload-conversations'))
  }

  async function unarchiveChat(peerId: string) {
    await setChatState(peerId, { archived: false })
    setArchivedConvs(prev => prev.filter(c => c.user.id !== peerId))
    setContextMenu(null)
  }

  async function togglePin(peerId: string, currentlyPinned: boolean) {
    await setChatState(peerId, { pinned: !currentlyPinned })
    setContextMenu(null)
    window.dispatchEvent(new CustomEvent('reload-conversations'))
  }

  async function deleteChat(peerId: string) {
    // Soft delete — just archive + mark
    await setChatState(peerId, { archived: true })
    setContextMenu(null)
    window.dispatchEvent(new CustomEvent('reload-conversations'))
  }

  async function createFolder(name: string, emoji: string, filters: Record<string, boolean>) {
    const res = await apiFetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji, ...filters }),
    })
    const json = await res.json()
    if (json.data) {
      setFolders(prev => [...prev, json.data])
      setShowCreateFolder(false)
    }
  }

  async function createGroup(name: string, description: string) {
    const res = await apiFetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, type: 'GROUP' }),
    })
    const json = await res.json()
    if (json.data) {
      setGroups(prev => [...prev, json.data])
      setShowCreateGroupModal(false)
      onSelectChannel?.(json.data.id)
    }
  }

  async function createChannel(name: string, description: string, isPrivate: boolean) {
    const res = await apiFetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, type: 'CHANNEL', isPrivate }),
    })
    const json = await res.json()
    if (json.data) {
      setChannels(prev => [...prev, json.data])
      setShowCreateChannelModal(false)
      onSelectChannel?.(json.data.id)
    }
  }

  async function deleteFolder(id: string) {
    await apiFetch(`/api/folders/${id}`, { method: 'DELETE' })
    setFolders(prev => prev.filter(f => f.id !== id))
    if (activeFolder === id) setActiveFolder('all')
  }

  async function addToFolder(folderId: string, peerId: string) {
    await apiFetch(`/api/folders/${folderId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, peerType: 'user' }),
    })
    setFolders(prev => prev.map(f => f.id === folderId
      ? { ...f, chats: [...f.chats.filter(c => c.peerId !== peerId), { peerId, pinned: false }] }
      : f
    ))
    setContextMenu(null)
  }

  function handlePointerDown(conv: Conversation, e: React.PointerEvent) {
    // На десктопе long press не нужен — есть правый клик
    if (e.pointerType === 'mouse') return
    longPressTimer.current = setTimeout(() => {
      setPreviewChat(conv)
    }, 500)
  }

  function handlePointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function handleContextMenu(conv: Conversation, e: React.MouseEvent) {
    e.preventDefault()
    setContextMenu({ peerId: conv.user.id, x: e.clientX, y: e.clientY })
  }

  // Filter conversations by active folder
  const getFilteredConvs = useCallback(() => {
    // При активном поиске — не фильтруем существующие чаты, показываем только API-результаты
    if (searchQuery.trim()) return []

    const source = activeFolder === 'archive' ? archivedConvs : conversations
    let result = source

    if (activeFolder !== 'all' && activeFolder !== 'archive') {
      const folder = folders.find(f => f.id === activeFolder)
      if (folder) {
        const folderPeerIds = new Set(folder.chats.map(c => c.peerId))
        result = result.filter(c => {
          if (folderPeerIds.has(c.user.id)) return true
          if (folder.filterUnread && c.unreadCount > 0) return true
          return false
        })
      }
    }

    return result
  }, [conversations, archivedConvs, activeFolder, folders, searchQuery])
  const filtered = getFilteredConvs()
  const contextConv = contextMenu ? (activeFolder === 'archive' ? archivedConvs : conversations).find(c => c.user.id === contextMenu.peerId) : null

  if (showUserSearch) {
    return (
      <UserSearch
        onSelect={(user) => { setShowUserSearch(false); onNewChat(user.id) }}
        onClose={() => setShowUserSearch(false)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-4 pb-3 pt-4">
        {/* Tabs: Чаты / Каналы */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            <button type="button" onClick={() => setMainTab('chats')}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150',
                mainTab === 'chats' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              Чаты
            </button>
            <button type="button" onClick={() => setMainTab('channels')}
              className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150',
                mainTab === 'channels' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              Каналы
            </button>
          </div>
          <button type="button"
            onClick={() => mainTab === 'chats' ? setShowUserSearch(true) : setShowCreateModal(true)}
            className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-[--accent-brand-muted] hover:text-[--accent-brand] transition-all active:scale-95">
            <Plus className="size-4" strokeWidth={2} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
          <input placeholder={mainTab === 'chats' ? t("chat.searchChats") : t("chat.searchChannels")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            data-search
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}` }}
            className="h-9 w-full rounded-xl bg-muted pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[--accent-brand]/20" />
          {searchQuery.trim() && (
            <button type="button" onClick={() => window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--accent-brand] hover:opacity-70 transition-opacity">
              <Search className="size-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Quick actions when no search - только для чатов */}
        {!searchQuery.trim() && mainTab === 'chats' && false && (
          <button type="button" onClick={() => setShowUserSearch(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted]">
              <MessageCircle className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-medium">{t('chat.personalMessage')}</p>
              <p className="text-xs text-muted-foreground">{t('chat.findUser')}</p>
            </div>
          </button>
        )}

        {/* Результаты поиска — встроены в основной список, дропдаун убран */}
      </div>

      {/* TG-style folder tabs — только для чатов */}
      {mainTab === 'chats' && (
        <div className="border-b border-border/60">
          <div className="flex overflow-x-auto scrollbar-none px-2 gap-1 py-2">
            {/* All */}
            <button type="button" onClick={() => setActiveFolder('all')}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                activeFolder === 'all'
                  ? 'bg-[--accent-brand] text-black'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}>
              Все
              {conversations.filter(c => (c.unreadCount ?? 0) > 0).length > 0 && activeFolder !== 'all' && (
                <span className="flex size-4 items-center justify-center rounded-full bg-foreground/20 text-[9px] font-bold">
                  {conversations.filter(c => (c.unreadCount ?? 0) > 0).length > 99 ? '99+' : conversations.filter(c => (c.unreadCount ?? 0) > 0).length}
                </span>
              )}
            </button>

            {/* Custom folders */}
            {folders.map(folder => {
              const folderPeerIds = new Set(folder.chats.map(c => c.peerId))
              const unreadConvs = conversations.filter(c =>
                (folderPeerIds.has(c.user.id) || (folder.filterUnread && c.unreadCount > 0)) && c.unreadCount > 0
              ).length
              return (
                <button key={folder.id} type="button" onClick={() => setActiveFolder(folder.id)}
                  className={cn(
                    'relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all group',
                    activeFolder === folder.id
                      ? 'bg-[--accent-brand] text-black'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}>
                  {folder.emoji && <span className="text-sm leading-none">{folder.emoji}</span>}
                  <span className="max-w-[80px] truncate">{folder.name}</span>
                  {unreadConvs > 0 && activeFolder !== folder.id && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-[--accent-brand] text-[9px] font-bold text-black">
                      {unreadConvs > 99 ? '99+' : unreadConvs}
                    </span>
                  )}
                  {/* Удаление папки по долгому нажатию */}
                  <button type="button"
                    onClick={e => { e.stopPropagation(); deleteFolder(folder.id) }}
                    className="ml-0.5 hidden group-hover:flex size-3.5 items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-all">
                    <X className="size-2" strokeWidth={2.5} />
                  </button>
                </button>
              )
            })}

            {/* Archive */}
            <button type="button" onClick={() => setActiveFolder('archive')}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                activeFolder === 'archive'
                  ? 'bg-[--accent-brand] text-black'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}>
              <Archive className="size-3.5" strokeWidth={activeFolder === 'archive' ? 2 : 1.5} />
              Архив
            </button>

            {/* Добавить раздел */}
            <button type="button" onClick={() => setShowCreateFolder(v => !v)}
              className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground transition-all">
              <FolderPlus className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      <CreateFolderModal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={createFolder}
      />

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight">Новый чат</p>
              <button type="button" onClick={() => setShowCreateModal(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={() => { setShowCreateModal(false); setShowUserSearch(true) }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted]">
                  <MessageCircle className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">Личное сообщение</p>
                </div>
              </button>
              <button type="button" onClick={() => { setShowCreateModal(false); setShowCreateGroupModal(true) }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">Группа</p>
                  <p className="text-xs text-muted-foreground">Чат для нескольких участников</p>
                </div>
              </button>
              <button type="button" onClick={() => { setShowCreateModal(false); setShowCreateChannelModal(true) }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Hash className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">Канал</p>
                  <p className="text-xs text-muted-foreground">Вещание для подписчиков</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список каналов */}
      {mainTab === 'channels' && (
        <div className="flex-1 overflow-y-auto">
          {channelsLoading ? (
            <div className="flex justify-center py-12"><div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" /></div>
          ) : channels.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <Hash className="size-10 text-muted-foreground" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">{searchQuery ? 'Ничего не найдено' : 'Нет каналов'}</p>
            </div>
          ) : (
            <div className="px-2 py-1">
              {channels
                .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(ch => (
                  <button key={ch.id} type="button"
                    onClick={() => onSelectChannel?.(ch.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/50 active:scale-[0.98]',
                      selectedChannelId === ch.id && 'bg-[--accent-brand-muted]',
                    )}>
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      {ch.avatarUrl
                        ? <Image src={ch.avatarUrl} alt={ch.name} width={48} height={48} className="size-full rounded-full object-cover" />
                        : <Hash className="size-5 text-muted-foreground" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="truncate text-sm font-semibold">{ch.name}</p>
                          {ch.isPrivate && <span className="text-[10px] text-muted-foreground">🔒</span>}
                        </div>
                        {ch.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(ch.lastMessageAt)}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="truncate text-xs text-muted-foreground">
                          {ch.lastMessage ?? `${ch.memberCount} уч.`}
                        </p>
                        {(ch.unreadCount ?? 0) > 0 && (
                          <span className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                            {(ch.unreadCount ?? 0) > 99 ? '99+' : ch.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Список диалогов + группы — смешанный список */}
      {mainTab === 'chats' && (
        <div className="flex-1 overflow-y-auto">

          {/* Результаты поиска через API */}
          {searchQuery.trim() && (
            <div className="px-2 py-1">
              {searchLoading ? (
                <div className="flex justify-center py-8"><div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" /></div>
              ) : searchResults ? (
                <>
                  {searchResults.users.length === 0 && searchResults.channels.length === 0 && (
                    <div className="flex flex-col items-center gap-3 p-8 text-center">
                      <p className="text-sm text-muted-foreground">Ничего не найдено</p>
                    </div>
                  )}
                  {searchResults.users.length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Пользователи</p>
                      {searchResults.users.map(u => (
                        <button key={u.id} type="button"
                          onClick={() => { setSearchQuery(''); onNewChat(u.id) }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/50 active:scale-[0.98]">
                          <div className="relative shrink-0">
                            <div className="size-12 overflow-hidden rounded-full bg-muted">
                              {u.avatarUrl
                                ? <Image src={u.avatarUrl} alt="" width={48} height={48} className="size-full object-cover" />
                                : <div className="flex size-full items-center justify-center text-base font-bold text-muted-foreground">{(u.displayName || u.username || '?').charAt(0).toUpperCase()}</div>
                              }
                            </div>
                            {u.isOnline && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{u.displayName || u.username || `User ${u.numericId}`}</p>
                            {u.username && <p className="truncate text-xs text-muted-foreground">@{u.username}</p>}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.channels.length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Каналы и группы</p>
                      {searchResults.channels.map(ch => (
                        <button key={ch.id} type="button"
                          onClick={() => { setSearchQuery(''); onSelectChannel?.(ch.id) }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/50 active:scale-[0.98]">
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                            {ch.avatarUrl
                              ? <Image src={ch.avatarUrl} alt={ch.name} width={48} height={48} className="size-full rounded-full object-cover" />
                              : <Hash className="size-5 text-muted-foreground" strokeWidth={1.5} />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{ch.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{ch.memberCount} уч.</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Обычный список — диалоги + группы вместе */}
          {!searchQuery.trim() && (
            <>
              {loading && activeFolder !== 'archive' ? (
                <ConversationSkeleton />
              ) : filtered.length === 0 && groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  {activeFolder === 'archive'
                    ? <Archive className="size-10 text-muted-foreground" strokeWidth={1} />
                    : <MessageCircle className="size-10 text-muted-foreground" strokeWidth={1} />
                  }
                  <p className="text-sm text-muted-foreground">
                    {activeFolder === 'archive' ? 'Архив пуст' : t('chat.noConversations')}
                  </p>
                  {activeFolder === 'all' && (
                    <button type="button" onClick={() => setShowUserSearch(true)}
                      className="rounded-xl bg-[--accent-brand] px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-all">
                      {t('chat.startNewChat')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="px-2 py-1">
                  {/* Диалоги */}
                  {filtered.map(conv => {
                    const name = conv.user.id === currentUserId ? 'Избранное' : (conv.user.displayName || conv.user.username || `User ${conv.user.numericId}`)
                    const isSelected = selectedUserId === conv.user.id
                    const isFavorites = conv.user.id === currentUserId
                    const folderEntry = activeFolder !== 'all' && activeFolder !== 'archive'
                      ? folders.find(f => f.id === activeFolder)?.chats.find(c => c.peerId === conv.user.id)
                      : null
                    const isPinned = folderEntry?.pinned ?? conv.pinned

                    return (
                      <button key={conv.user.id} type="button"
                        onClick={() => onSelectConversation(conv.user.id)}
                        onContextMenu={e => handleContextMenu(conv, e)}
                        onPointerDown={e => handlePointerDown(conv, e)}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        className={cn(
                          'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98]',
                          isSelected ? 'bg-[--accent-brand-muted]' : 'hover:bg-muted/50',
                        )}>
                        <div className="relative shrink-0">
                          <div className={cn('size-12 overflow-hidden rounded-full', isFavorites ? 'bg-[--accent-brand]' : 'bg-muted')}>
                            {isFavorites ? (
                              <div className="flex size-full items-center justify-center">
                                <Star className="size-5 text-black" strokeWidth={2} fill="black" />
                              </div>
                            ) : conv.user.avatarUrl ? (
                              <Image src={conv.user.avatarUrl} alt={name} width={48} height={48} className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-base font-bold text-muted-foreground">
                                {(name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {!isFavorites && conv.user.isOnline && (
                            <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              {isPinned && <Pin className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
                              <p className={cn('truncate text-sm font-semibold', isSelected && 'text-[--accent-brand]')}>{name}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(conv.lastMessageAt)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {!isFavorites && conv.lastMessageSenderId === currentUserId && (
                                conv.lastMessageReadAt
                                  ? <CheckCheck className="size-3.5 shrink-0 text-[--accent-brand]" strokeWidth={2} />
                                  : <Check className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                              )}
                              {typingUsers?.has(conv.user.id) ? (
                                <p className="truncate text-xs text-[--accent-brand] animate-pulse">печатает...</p>
                              ) : (
                                <p className="truncate text-xs text-muted-foreground">
                                  {isFavorites
                                    ? 'Сохранённые сообщения'
                                    : conv.lastMessage
                                      ? (() => {
                                          // Если сообщение выглядит как зашифрованное (base64 без пробелов длиннее 40 символов)
                                          const isEncrypted = conv.lastMessage.length > 40 && !/\s/.test(conv.lastMessage)
                                          const displayMsg = isEncrypted ? '🔒 Сообщение' : conv.lastMessage
                                          return (conv as any).lastMessageSenderName && conv.lastMessageSenderId !== currentUserId
                                            ? <><span className="font-medium text-foreground/70 shrink-0">{(conv as any).lastMessageSenderName}:</span>&nbsp;{displayMsg}</>
                                            : displayMsg
                                        })()
                                      : conv.user.isOnline ? 'онлайн' : ''
                                  }
                                </p>
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {/* Группы — рядом с диалогами, без заголовка */}
                  {activeFolder === 'all' && groups.map(g => (
                    <button key={g.id} type="button"
                      onClick={() => onSelectChannel?.(g.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98]',
                        selectedChannelId === g.id ? 'bg-[--accent-brand-muted]' : 'hover:bg-muted/50',
                      )}>
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                        {g.avatarUrl
                          ? <Image src={g.avatarUrl} alt={g.name} width={48} height={48} className="size-full rounded-full object-cover" />
                          : <Users className="size-5 text-muted-foreground" strokeWidth={1.5} />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className={cn('truncate text-sm font-semibold', selectedChannelId === g.id && 'text-[--accent-brand]')}>{g.name}</p>
                            {g.isPrivate && <span className="text-[10px] text-muted-foreground">🔒</span>}
                          </div>
                          {g.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(g.lastMessageAt)}</span>}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="truncate text-xs text-muted-foreground">
                            {g.lastMessage
                              ? (g.lastMessageSenderName
                                  ? <><span className="font-medium text-foreground/70">{g.lastMessageSenderName}:</span>&nbsp;{g.lastMessage}</>
                                  : g.lastMessage)
                              : `${g.memberCount} уч.`
                            }
                          </p>
                          {(g.unreadCount ?? 0) > 0 && (
                            <span className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                              {(g.unreadCount ?? 0) > 99 ? '99+' : g.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && contextConv && (
        <div ref={contextRef}
          className="fixed z-50 min-w-48 overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
          style={{ 
            left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200), 
            top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 300) 
          }}>
          <div className="p-1 space-y-0.5">
            {/* Pin/Unpin */}
            <button type="button" onClick={() => togglePin(contextMenu.peerId, contextConv.pinned)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
              {contextConv.pinned ? <PinOff className="size-4 text-muted-foreground" strokeWidth={1.5} /> : <Pin className="size-4 text-muted-foreground" strokeWidth={1.5} />}
              {contextConv.pinned ? 'Открепить' : 'Закрепить'}
            </button>

            {/* Archive/Unarchive — не для Избранного */}
            {contextMenu.peerId !== currentUserId && (
              activeFolder === 'archive' ? (
                <button type="button" onClick={() => unarchiveChat(contextMenu.peerId)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                  <Archive className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  Из архива
                </button>
              ) : (
                <button type="button" onClick={() => archiveChat(contextMenu.peerId)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                  <Archive className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  В архив
                </button>
              )
            )}

            {/* Add to folder */}
            {folders.length > 0 && activeFolder === 'all' && (
              <>
                <div className="h-px bg-border mx-2" />
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Добавить в раздел</p>
                {folders.map(folder => {
                  const inFolder = folder.chats.some(c => c.peerId === contextMenu.peerId)
                  return (
                    <button key={folder.id} type="button" onClick={() => !inFolder && addToFolder(folder.id, contextMenu.peerId)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                        inFolder ? 'text-muted-foreground cursor-default' : 'hover:bg-muted/50',
                      )}>
                      <span className="text-base">{folder.emoji ?? '📁'}</span>
                      {folder.name}
                      {inFolder && <Check className="ml-auto size-3.5 text-[--accent-brand]" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </>
            )}

            {contextMenu.peerId !== currentUserId && <div className="h-px bg-border mx-2" />}

            {/* Delete — не для Избранного */}
            {contextMenu.peerId !== currentUserId && (
              <button type="button" onClick={() => deleteChat(contextMenu.peerId)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="size-4" strokeWidth={1.5} />
                Удалить чат
              </button>
            )}
          </div>
        </div>
      )}

      {/* Long-press preview */}
      {previewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewChat(null)}>
          <div className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Mini chat header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="size-10 overflow-hidden rounded-full bg-muted">
                {previewChat.user.avatarUrl
                  ? <Image src={previewChat.user.avatarUrl} alt="" width={40} height={40} className="size-full object-cover" />
                  : <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                      {(previewChat.user.displayName || previewChat.user.username || '?').charAt(0).toUpperCase()}
                    </div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {previewChat.user.displayName || previewChat.user.username || `User ${previewChat.user.numericId}`}
                </p>
                <p className="text-xs text-muted-foreground">{previewChat.user.isOnline ? 'онлайн' : 'не в сети'}</p>
              </div>
              <button type="button" onClick={() => setPreviewChat(null)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 p-3">
              <button type="button" onClick={() => { onSelectConversation(previewChat.user.id); setPreviewChat(null) }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 transition-all">
                <MessageCircle className="size-4" strokeWidth={2} />
                Открыть
              </button>
              <button type="button" onClick={() => { togglePin(previewChat.user.id, previewChat.pinned); setPreviewChat(null) }}
                className={cn('flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all',
                  previewChat.user.id === currentUserId ? 'col-span-2' : '')}>
                <Pin className="size-4" strokeWidth={1.5} />
                {previewChat.pinned ? 'Открепить' : 'Закрепить'}
              </button>
              {/* Архив и удаление — не для Избранного */}
              {previewChat.user.id !== currentUserId && (
                <>
                  <button type="button" onClick={() => { archiveChat(previewChat.user.id); setPreviewChat(null) }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
                    <Archive className="size-4" strokeWidth={1.5} />
                    В архив
                  </button>
                  <button type="button" onClick={() => { deleteChat(previewChat.user.id); setPreviewChat(null) }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CreateGroupModal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={createGroup}
      />

      <CreateChannelModal
        open={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreate={createChannel}
      />

    </div>
  )
}
