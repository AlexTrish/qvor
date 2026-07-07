'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/hooks/useAuth'
import { useSSE } from '@/hooks/useSSE'
import { Hash, Plus, Users, Lock, X, Check, Send, Settings, Trash2, Crown, Shield, UserMinus, UserPlus, ArrowLeft, MessagesSquare, Link2, Copy, Globe, Newspaper, BookOpen, Laugh, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Channel = {
  id: string; name: string; description?: string | null; avatarUrl?: string | null
  isPrivate: boolean; type: 'CHANNEL' | 'GROUP'; category: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' | null; memberCount: number; lastMessageAt: string; unreadCount?: number
}
type Member = {
  id: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; joinedAt: string
  user: { id: string; numericId: number; username?: string | null; displayName?: string | null; avatarUrl?: string | null; isOnline: boolean }
}
type Message = {
  id: string; senderId: string; channelId: string; ciphertext: string; iv: string
  createdAt: string; editedAt?: string | null
  sender: { id: string; numericId: number; username?: string | null; displayName?: string | null; avatarUrl?: string | null }
}

const CATEGORIES = [
  { value: 'news',  label: 'News', icon: Newspaper },
  { value: 'blogs', label: 'Blog', icon: BookOpen },
  { value: 'memes', label: 'Memes', icon: Laugh },
  { value: 'other', label: 'Other', icon: Hash },
] as const

const ROLE_ICONS = { OWNER: Crown, ADMIN: Shield, MEMBER: null }
const ROLE_LABELS = { OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member' }

function ChannelChat({ channel, currentUserId, onUpdate }: { channel: Channel; currentUserId: string; onUpdate: (ch: Partial<Channel>) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [settingsName, setSettingsName] = useState(channel.name)
  const [settingsDesc, setSettingsDesc] = useState(channel.description ?? '')
  const [settingsPrivate, setSettingsPrivate] = useState(channel.isPrivate)
  const [settingsType, setSettingsType] = useState<'CHANNEL' | 'GROUP'>(channel.type)
  const [settingsCategory, setSettingsCategory] = useState(channel.category ?? 'other')
  const [settingsAvatarFile, setSettingsAvatarFile] = useState<File | null>(null)
  const [settingsAvatarPreview, setSettingsAvatarPreview] = useState<string | null>(channel.avatarUrl ?? null)
  const [settingsAvatarUploading, setSettingsAvatarUploading] = useState(false)
  const [settingsAvatarError, setSettingsAvatarError] = useState<string | null>(null)
  const [newChannelAvatarFile, setNewChannelAvatarFile] = useState<File | null>(null)
  const [newChannelAvatarPreview, setNewChannelAvatarPreview] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<{ id: string; displayName?: string | null; username?: string | null; avatarUrl?: string | null }[]>([])
  const [contacts, setContacts] = useState<{ id: string; displayName?: string | null; username?: string | null; avatarUrl?: string | null }[]>([])
  const [showContacts, setShowContacts] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false)
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/channels/${channel.id}/messages`)
    const json = await res.json()
    setMessages(json.data ?? [])
    setLoading(false)
    // Сбрасываем счётчик непрочитанных
    fetch(`/api/channels/${channel.id}/read`, { method: 'POST' }).catch(() => null)
  }, [channel.id])

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/channels/${channel.id}/members`)
    const json = await res.json()
    setMembers(json.data ?? [])
  }, [channel.id])

  useEffect(() => { setSettingsAvatarPreview(channel.avatarUrl ?? null) }, [channel.avatarUrl])
  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { if (showMembers) loadMembers() }, [showMembers, loadMembers])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useSSE({
    message: (data) => {
      const msg = data as Message
      if (msg.channelId === channel.id) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      }
    },
  })

  async function sendMessage() {
    if (!text.trim() || sending) return
    setSending(true)
    const optimistic: Message = {
      id: crypto.randomUUID(), senderId: currentUserId, channelId: channel.id,
      ciphertext: text.trim(), iv: 'plain-' + Date.now(), createdAt: new Date().toISOString(),
      sender: { id: currentUserId, numericId: 0 },
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    try {
      const res = await fetch(`/api/channels/${channel.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext: optimistic.ciphertext, iv: optimistic.iv }),
      })
      const json = await res.json()
      if (json.data) setMessages(prev => prev.map(m => m.id === optimistic.id ? json.data : m))
      else setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally { setSending(false); inputRef.current?.focus() }
  }

  async function kickMember(userId: string) {
    await fetch(`/api/channels/${channel.id}/members/${userId}`, { method: 'DELETE' })
    setMembers(prev => prev.filter(m => m.user.id !== userId))
  }

  async function changeRole(userId: string, role: 'ADMIN' | 'MEMBER') {
    await fetch(`/api/channels/${channel.id}/members/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
    })
    setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role } : m))
  }

  async function searchInvite(q: string) {
    setInviteQuery(q)
    if (!q.trim()) { setInviteResults([]); return }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    const memberIds = new Set(members.map(m => m.user.id))
    setInviteResults((json.data ?? []).filter((u: { id: string }) => !memberIds.has(u.id)))
  }

  async function uploadChannelAvatar(channelId: string, file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await fetch(`/api/channels/${channelId}/avatar`, { method: 'POST', body: formData })
    const json = await res.json()
    if (!res.ok || !json.avatarUrl) {
      throw new Error(json.error || 'Avatar upload failed')
    }
    return json.avatarUrl as string
  }

  async function inviteUser(userId: string) {
    await fetch(`/api/channels/${channel.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
    })
    setInviteQuery(''); setInviteResults([])
    loadMembers()
  }

  async function loadContacts() {
    const res = await fetch('/api/users/search?q=&contacts=1')
    const json = await res.json()
    const memberIds = new Set(members.map(m => m.user.id))
    setContacts((json.data ?? []).filter((u: { id: string }) => !memberIds.has(u.id)))
  }

  async function generateInviteLink() {
    setInviteLinkLoading(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}/invite`, { method: 'POST' })
      const json = await res.json()
      if (json.data) {
        const link = `${window.location.origin}/channels?invite=${channel.id}&token=${json.data.token}`
        setInviteLink(link)
      }
    } finally { setInviteLinkLoading(false) }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setInviteLinkCopied(true)
    setTimeout(() => setInviteLinkCopied(false), 2000)
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsAvatarError(null)
    try {
      let avatarUrl: string | undefined
      if (settingsAvatarFile) {
        setSettingsAvatarUploading(true)
        avatarUrl = await uploadChannelAvatar(channel.id, settingsAvatarFile)
      }

      const payload: Record<string, unknown> = {
        name: settingsName.trim(),
        description: settingsDesc.trim() || null,
        isPrivate: settingsPrivate,
        type: settingsType,
        category: settingsCategory,
      }

      if (avatarUrl) payload.avatarUrl = avatarUrl

      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.data) {
        onUpdate({
          name: json.data.name,
          description: json.data.description,
          isPrivate: json.data.isPrivate,
          type: json.data.type,
          category: json.data.category,
          avatarUrl: json.data.avatarUrl,
        })
        if (avatarUrl) {
          setSettingsAvatarPreview(avatarUrl)
          setSettingsAvatarFile(null)
        }
        setShowSettings(false)
      }
    } catch (error) {
      setSettingsAvatarError((error as Error).message)
    } finally {
      setSettingsSaving(false)
      setSettingsAvatarUploading(false)
    }
  }

  const canManage = channel.role === 'OWNER' || channel.role === 'ADMIN'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          {channel.avatarUrl
            ? <Image src={channel.avatarUrl} alt={channel.name} width={36} height={36} className="size-full rounded-full object-cover" />
            : channel.type === 'GROUP'
              ? <MessagesSquare className="size-4 text-muted-foreground" strokeWidth={1.5} />
              : <Hash className="size-4 text-muted-foreground" strokeWidth={1.5} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{channel.name}</p>
            {channel.isPrivate && <Lock className="size-3 text-muted-foreground" strokeWidth={1.5} />}
          </div>
          <p className="text-xs text-muted-foreground">{channel.memberCount} members</p>
        </div>
        <button type="button" onClick={() => { setShowMembers(v => !v); setShowSettings(false) }}
          className={cn('flex size-8 items-center justify-center rounded-xl transition-all', showMembers ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}>
          <Users className="size-4" strokeWidth={1.5} />
        </button>
        {canManage && (
          <button type="button" onClick={() => { setShowSettings(v => !v); setShowMembers(false) }}
            className={cn('flex size-8 items-center justify-center rounded-xl transition-all', showSettings ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}>
            <Settings className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Hash className="size-10 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">Нет сообщений. Начните общение!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId
                const prev = messages[i - 1]
                const sameAuthor = prev?.senderId === msg.senderId
                const senderName = msg.sender.displayName || msg.sender.username || `User ${msg.sender.numericId}`
                return (
                  <div key={msg.id} className={cn('flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start', sameAuthor ? 'mt-0.5' : 'mt-3')}>
                    {!isOwn && (
                      <div className="size-6 shrink-0 mb-0.5">
                        {!sameAuthor && (
                          <div className="size-6 overflow-hidden rounded-full bg-muted">
                            {msg.sender.avatarUrl
                              ? <Image src={msg.sender.avatarUrl} alt={senderName} width={24} height={24} className="size-full object-cover" />
                              : <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">{(senderName || "?").charAt(0).toUpperCase()}</div>
                            }
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn('max-w-[70%]', isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
                      {!isOwn && !sameAuthor && (
                        <p className="mb-0.5 px-1 text-[10px] font-medium text-muted-foreground">{senderName}</p>
                      )}
                      <div className={cn(
                        'rounded-[18px] px-3 py-2 text-sm',
                        isOwn ? 'bg-foreground text-background rounded-br-[4px]' : 'bg-muted text-foreground rounded-bl-[4px] dark:bg-[oklch(0.26_0_0)] dark:ring-1 dark:ring-[oklch(1_0_0/15%)]',
                        sameAuthor && isOwn && 'rounded-br-[18px] rounded-tr-[4px]',
                        sameAuthor && !isOwn && 'rounded-bl-[18px] rounded-tl-[4px]',
                      )}>
                        <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.ciphertext}</p>
                        <p className={cn('mt-0.5 text-[10px]', isOwn ? 'text-background/50 text-right' : 'text-muted-foreground')}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.editedAt && ' · edited'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background/80 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-end rounded-full border border-border bg-muted/50 px-4 py-2">
                <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Message..." rows={1}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: '120px' }} />
              </div>
              <button type="button" onClick={sendMessage} disabled={sending || !text.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-30">
                {sending
                  ? <div className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  : <Send className="size-4 -translate-x-px" strokeWidth={2.5} />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && canManage && (
          <div className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Channel settings</p>
              <button type="button" onClick={() => setShowSettings(false)}
                className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={saveSettings} className="flex flex-col gap-4 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avatar</label>
                <div className="flex items-center gap-3">
                  <div className="size-14 overflow-hidden rounded-full bg-muted">
                    {settingsAvatarPreview
                      ? <img src={settingsAvatarPreview} alt="Channel avatar preview" className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center text-muted-foreground">
                          {settingsType === 'GROUP' ? <MessagesSquare className="size-5" strokeWidth={1.5} /> : <Hash className="size-5" strokeWidth={1.5} />}
                        </div>
                    }
                  </div>
                  <div className="flex flex-col gap-2">
                    <input id="channel-avatar-upload" type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null
                        if (!file) return
                        setSettingsAvatarFile(file)
                        setSettingsAvatarPreview(URL.createObjectURL(file))
                      }}
                    />
                    <label htmlFor="channel-avatar-upload" className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                      Choose image
                    </label>
                    {settingsAvatarFile && <p className="text-xs text-muted-foreground">{settingsAvatarFile.name}</p>}
                    {settingsAvatarUploading && <p className="text-xs text-muted-foreground">Uploading avatar...</p>}
                    {settingsAvatarError && <p className="text-xs text-destructive">{settingsAvatarError}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
                <input value={settingsName} onChange={e => setSettingsName(e.target.value)} maxLength={100}
                  className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
                <textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} maxLength={500} rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div className={cn('flex size-5 items-center justify-center rounded-md border-2 transition-all', settingsPrivate ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border')}
                  onClick={() => setSettingsPrivate(v => !v)}>
                  {settingsPrivate && <Check className="size-3 text-black" strokeWidth={3} />}
                </div>
                <div>
                  <p className="text-sm font-medium">Private</p>
                  <p className="text-xs text-muted-foreground">Invite-only</p>
                </div>
              </label>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</label>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button type="button" onClick={() => setSettingsType('CHANNEL')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', settingsType === 'CHANNEL' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Channel
                  </button>
                  <button type="button" onClick={() => setSettingsType('GROUP')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', settingsType === 'GROUP' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Group
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setSettingsCategory(cat.value)}
                      className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                        settingsCategory === cat.value ? 'border-[--accent-brand] bg-[--accent-brand-muted] text-[--accent-brand]' : 'border-border text-muted-foreground hover:bg-muted/40')}>
                      <cat.icon className="size-3.5" strokeWidth={1.5} />{cat.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Invite link */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invite link</label>
                {inviteLink ? (
                  <div className="flex items-center gap-2">
                    <input readOnly value={inviteLink} className="h-8 flex-1 rounded-xl border border-border bg-muted/30 px-2 text-xs outline-none truncate" />
                    <button type="button" onClick={copyInviteLink}
                      className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl border transition-all',
                        inviteLinkCopied ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-border hover:bg-muted/50')}>
                      {inviteLinkCopied ? <Check className="size-3.5" strokeWidth={2.5} /> : <Copy className="size-3.5" strokeWidth={1.5} />}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={generateInviteLink} disabled={inviteLinkLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium hover:bg-muted/40 transition-all disabled:opacity-50">
                    <Link2 className="size-3.5" strokeWidth={1.5} />
                    {inviteLinkLoading ? 'Generating...' : 'Generate link'}
                  </button>
                )}
              </div>
              <button type="submit" disabled={settingsSaving || !settingsName.trim()}
                className="h-9 rounded-xl bg-[--accent-brand] text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition-all">
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        )}
        {showMembers && (
          <div className="w-64 shrink-0 border-l border-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Members</p>
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => { setShowContacts(v => !v); if (!showContacts) loadContacts() }}
                    className={cn('flex size-7 items-center justify-center rounded-lg transition-all', showContacts ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}
                    title="Add contacts">
                    <UserCheck className="size-3.5" strokeWidth={1.5} />
                  </button>
                  <div className="relative">
                    <input value={inviteQuery} onChange={e => searchInvite(e.target.value)}
                      placeholder="Search..." className="h-7 w-28 rounded-lg border border-border bg-muted/50 px-2 text-xs outline-none focus:border-[--accent-brand]" />
                    {inviteResults.length > 0 && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                        {inviteResults.map(u => (
                          <button key={u.id} type="button" onClick={() => inviteUser(u.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                            <div className="size-6 overflow-hidden rounded-full bg-muted shrink-0">
                              {u.avatarUrl ? <Image src={u.avatarUrl} alt="" width={24} height={24} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">{(u.displayName || u.username || '?').charAt(0).toUpperCase()}</div>}
                            </div>
                            <span className="truncate">{u.displayName || u.username}</span>
                            <UserPlus className="ml-auto size-3 shrink-0 text-[--accent-brand]" strokeWidth={2} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Contacts panel */}
            {showContacts && contacts.length > 0 && (
              <div className="border-b border-border px-3 py-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Contacts</p>
                <div className="space-y-0.5">
                  {contacts.map(u => (
                    <button key={u.id} type="button" onClick={() => inviteUser(u.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors">
                      <div className="size-6 overflow-hidden rounded-full bg-muted shrink-0">
                        {u.avatarUrl ? <Image src={u.avatarUrl} alt="" width={24} height={24} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">{(u.displayName || u.username || '?').charAt(0).toUpperCase()}</div>}
                      </div>
                      <span className="flex-1 truncate text-left">{u.displayName || u.username}</span>
                      <UserPlus className="size-3 shrink-0 text-[--accent-brand]" strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {members.map(m => {
                const name = m.user.displayName || m.user.username || `User ${m.user.numericId}`
                const RoleIcon = ROLE_ICONS[m.role]
                const isMe = m.user.id === currentUserId
                return (
                  <div key={m.id} className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors">
                    <div className="relative shrink-0">
                      <div className="size-8 overflow-hidden rounded-full bg-muted">
                        {m.user.avatarUrl ? <Image src={m.user.avatarUrl} alt={name} width={32} height={32} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>}
                      </div>
                      {m.user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-green-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        {RoleIcon && <RoleIcon className="size-3 shrink-0 text-[--accent-brand]" strokeWidth={2} />}
                        <p className="truncate text-xs font-medium">{name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[m.role]}</p>
                    </div>
                    {canManage && !isMe && m.role !== 'OWNER' && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button type="button" onClick={() => changeRole(m.user.id, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground" title={m.role === 'ADMIN' ? 'Снять права' : 'Сделать админом'}>
                          <Shield className="size-3" strokeWidth={1.5} />
                        </button>
                        <button type="button" onClick={() => kickMember(m.user.id)}
                          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <UserMinus className="size-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelRow({ ch, selected, onSelect, onDelete, onLeave }: {
  ch: Channel
  selected: Channel | null
  onSelect: (ch: Channel) => void
  onDelete: (id: string) => void
  onLeave: (id: string) => void
}) {
  return (
    <button type="button" onClick={() => onSelect(ch)}
      className={cn('group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.98]', selected?.id === ch.id ? 'bg-[--accent-brand-muted]' : 'hover:bg-muted/50')}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
        {ch.avatarUrl ? <Image src={ch.avatarUrl} alt={ch.name} width={44} height={44} className="size-full rounded-full object-cover" /> : ch.type === 'GROUP' ? <MessagesSquare className="size-5 text-muted-foreground" strokeWidth={1.5} /> : <Hash className="size-5 text-muted-foreground" strokeWidth={1.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className={cn('truncate text-sm font-semibold', selected?.id === ch.id && 'text-[--accent-brand]')}>{ch.name}</p>
          {ch.isPrivate && <Lock className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
        </div>
        <p className="text-xs text-muted-foreground">{ch.memberCount} members</p>
      </div>
      {(ch.unreadCount ?? 0) > 0 && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
          {(ch.unreadCount ?? 0) > 99 ? '99+' : ch.unreadCount}
        </span>
      )}
      {ch.role && ch.role !== null && (
        <div className="hidden group-hover:flex items-center">
          <button type="button" onClick={e => { e.stopPropagation(); ch.role === 'OWNER' ? onDelete(ch.id) : onLeave(ch.id) }}
            className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={ch.role === 'OWNER' ? 'Delete' : 'Leave'}>
            {ch.role === 'OWNER' ? <Trash2 className="size-3" strokeWidth={1.5} /> : <X className="size-3" strokeWidth={2} />}
          </button>
        </div>
      )}
    </button>
  )
}

export default function ChannelsPage() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [publicChannels, setPublicChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [channelType, setChannelType] = useState<'CHANNEL' | 'GROUP'>('CHANNEL')
  const [category, setCategory] = useState('other')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'CHANNEL' | 'GROUP' | 'public'>('all')
  const [inviteJoining, setInviteJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/channels').then(r => r.json()).then(d => setChannels(d.data ?? [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'public') {
      fetch('/api/channels?public=1').then(r => r.json()).then(d => setPublicChannels(d.data ?? []))
    }
  }, [activeTab])

  // Handle invite link from URL: /channels?invite=ID&token=TOKEN
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const inviteId = params.get('invite')
    const token = params.get('token')
    if (!inviteId || !token) return
    setInviteJoining(true)
    fetch(`/api/channels/${inviteId}/invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          const ch = { ...d.data.channel, role: 'MEMBER' as const, memberCount: 0, lastMessageAt: new Date().toISOString(), category: 'other' }
          if (!d.data.alreadyMember) setChannels(prev => [ch, ...prev.filter(c => c.id !== ch.id)])
          setSelected(ch)
          window.history.replaceState({}, '', '/channels')
        } else {
          setInviteError(d.error ?? 'Недействительная ссылка')
        }
      })
      .finally(() => setInviteJoining(false))
  }, [])

  function handleSelectChannel(ch: Channel) {
    setSelected(ch)
    setCreating(false)
    // Сбрасываем бейдж локально
    setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, unreadCount: 0 } : c))
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, isPrivate, type: channelType, category }),
    })
    const json = await res.json()
    if (json.data) {
      const ch = { ...json.data, role: 'OWNER' as const, memberCount: 1, lastMessageAt: new Date().toISOString() }
      setChannels(prev => [ch, ...prev])
      setSelected(ch)
      setCreating(false); setName(''); setDescription(''); setIsPrivate(false); setChannelType('CHANNEL'); setCategory('other')
    }
    setSaving(false)
  }

  async function deleteChannel(id: string) {
    await fetch(`/api/channels/${id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function leaveChannel(id: string) {
    if (!user) return
    await fetch(`/api/channels/${id}/members/${user.id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AppNav />
      <div className="flex flex-1 gap-3 overflow-hidden p-4 mobile-pb">

        {/* List */}
        <div className={cn('flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden', selected ? 'hidden md:flex w-64 shrink-0' : 'flex w-full md:w-64 md:shrink-0')}>
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <h1 className="font-[family-name:var(--font-syne)] text-lg font-black tracking-tight">Каналы</h1>
            <button type="button" onClick={() => { setCreating(true); setSelected(null) }}
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-[--accent-brand-muted] hover:text-[--accent-brand] transition-all active:scale-95">
              <Plus className="size-4" strokeWidth={2} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-xl bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[--accent-brand]/20"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/60 px-3 pt-1 overflow-x-auto scrollbar-none">
            {([['all', 'All'], ['CHANNEL', 'Channels'], ['GROUP', 'Groups'], ['public', 'Public']] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setActiveTab(val)}
                className={cn(
                  'relative shrink-0 flex-1 py-2 text-xs font-medium transition-all',
                  activeTab === val ? 'text-[--accent-brand]' : 'text-muted-foreground hover:text-foreground',
                )}>
                {label}
                {activeTab === val && <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[--accent-brand]" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {loading ? (
              <div className="flex justify-center p-8"><div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" /></div>
            ) : inviteJoining ? (
              <div className="flex justify-center p-8"><div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" /></div>
            ) : inviteError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-destructive">{inviteError}</p>
                <button type="button" onClick={() => setInviteError(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
              </div>
            ) : (() => {
              const source = activeTab === 'public' ? publicChannels : channels
              const filtered = source.filter(ch => {
                const matchTab = activeTab === 'all' || activeTab === 'public' || ch.type === activeTab
                const matchSearch = !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase())
                return matchTab && matchSearch
              })
              // Group by category for public tab
              if (activeTab === 'public' && filtered.length > 0) {
                const grouped = CATEGORIES.map(cat => ({
                  ...cat,
                  items: filtered.filter(ch => (ch.category ?? 'other') === cat.value),
                })).filter(g => g.items.length > 0)
                return (
                  <div className="space-y-4 py-1">
                    {grouped.map(group => (
                      <div key={group.value}>
                        <div className="flex items-center gap-1.5 px-2 pb-1">
                          <group.icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map(ch => <ChannelRow key={ch.id} ch={ch} selected={selected} onSelect={handleSelectChannel} onDelete={deleteChannel} onLeave={leaveChannel} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-muted"><Hash className="size-6 text-muted-foreground" strokeWidth={1.5} /></div>
                  <p className="text-sm text-muted-foreground">{searchQuery ? 'Nothing found' : 'No channels or groups yet'}</p>
                  {!searchQuery && activeTab !== 'public' && <button type="button" onClick={() => setCreating(true)} className="rounded-xl bg-[--accent-brand] px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-all">Create</button>}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map(ch => <ChannelRow key={ch.id} ch={ch} selected={selected} onSelect={handleSelectChannel} onDelete={deleteChannel} onLeave={leaveChannel} />)}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Main area */}
        <div className={cn('flex-1 flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden', !selected && !creating ? 'hidden md:flex' : 'flex')}>
          {selected ? (
            <>
              {/* Mobile back */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
                <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-[--accent-brand]">
                  <ArrowLeft className="size-4" strokeWidth={2.5} />
                </button>
              </div>
              <ChannelChat channel={selected} currentUserId={user?.id ?? ''} onUpdate={updates => {
                setSelected(prev => prev ? { ...prev, ...updates } : prev)
                setChannels(prev => prev.map(c => c.id === selected.id ? { ...c, ...updates } : c))
              }} />
            </>
          ) : creating ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-[family-name:var(--font-syne)] text-base font-bold">{channelType === 'GROUP' ? 'New group' : 'New channel'}</h2>
                <button type="button" onClick={() => setCreating(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" strokeWidth={1.5} /></button>
              </div>
              <form onSubmit={createChannel} className="flex flex-col gap-4 p-5 max-w-md">
                <div className="flex gap-2 rounded-xl border border-border overflow-hidden mb-1">
                  <button type="button" onClick={() => setChannelType('CHANNEL')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', channelType === 'CHANNEL' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Channel
                  </button>
                  <button type="button" onClick={() => setChannelType('GROUP')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', channelType === 'GROUP' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Group
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="My channel" maxLength={100}
                    className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this channel about..." maxLength={500} rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className={cn('flex size-5 items-center justify-center rounded-md border-2 transition-all', isPrivate ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border')} onClick={() => setIsPrivate(v => !v)}>
                    {isPrivate && <Check className="size-3 text-black" strokeWidth={3} />}
                  </div>
                  <div><p className="text-sm font-medium">Private</p><p className="text-xs text-muted-foreground">Invite-only</p></div>
                </label>
                {channelType === 'CHANNEL' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                          className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                            category === cat.value ? 'border-[--accent-brand] bg-[--accent-brand-muted] text-[--accent-brand]' : 'border-border text-muted-foreground hover:bg-muted/40')}>
                          <cat.icon className="size-3.5" strokeWidth={1.5} />{cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={saving || !name.trim()} className="h-10 rounded-xl bg-[--accent-brand] text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition-all">
                  {saving ? 'Creating...' : channelType === 'GROUP' ? 'Create group' : 'Create channel'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted"><Hash className="size-7 text-muted-foreground" strokeWidth={1} /></div>
              <p className="text-sm font-medium">Select a channel</p>
              <p className="text-xs text-muted-foreground">or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}