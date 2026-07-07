'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useSSE } from '@/hooks/useSSE'
import { Hash, Plus, Users, Lock, X, Check, Send, Settings, Trash2, Crown, Shield, UserMinus, UserPlus, ArrowLeft, MessagesSquare, Link2, Copy, Newspaper, BookOpen, Laugh, UserCheck, Reply, Edit2, MoreVertical, Phone, Video, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useChannelCrypto } from '@/hooks/useChannelCrypto'
import { useCall } from '@/components/CallProvider'
import { ReportModal } from '@/components/ReportModal'

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

type Channel = {
  id: string; name: string; description?: string | null; avatarUrl?: string | null
  isPrivate: boolean; type: 'CHANNEL' | 'GROUP'; category: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' | null; memberCount: number; lastMessageAt: string
  lastMessage?: string | null; lastMessageSenderName?: string | null; unreadCount?: number
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
  { value: 'news',  label: 'Новости', icon: Newspaper },
  { value: 'blogs', label: 'Блог', icon: BookOpen },
  { value: 'memes', label: 'Мемы', icon: Laugh },
  { value: 'other', label: 'Другое', icon: Hash },
] as const

const ROLE_ICONS = { OWNER: Crown, ADMIN: Shield, MEMBER: null }
const ROLE_LABELS = { OWNER: 'channel.roleOwner', ADMIN: 'channel.roleAdmin', MEMBER: 'channel.roleMember' }

function ChannelChat({ channel, currentUserId, onBack, onUpdate, onDelete, onLeave }: {
  channel: Channel
  currentUserId: string
  onBack: () => void
  onUpdate: (ch: Partial<Channel>) => void
  onDelete: (id: string) => void
  onLeave: (id: string) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const { t } = useTranslation()
  const { encryptForChannel, decryptFromChannel, encryptKeyForUser } = useChannelCrypto()
  const { startGroupCall } = useCall()
  const [reportOpen, setReportOpen] = useState(false)
  const [decrypted, setDecrypted] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [reactions, setReactions] = useState<Map<string, { emoji: string; count: number; mine: boolean }[]>>(new Map())
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [settingsName, setSettingsName] = useState(channel.name)
  const [settingsDesc, setSettingsDesc] = useState(channel.description ?? '')
  const [settingsPrivate, setSettingsPrivate] = useState(channel.isPrivate)
  const [settingsType, setSettingsType] = useState<'CHANNEL' | 'GROUP'>(channel.type)
  const [settingsCategory, setSettingsCategory] = useState(channel.category ?? 'other')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsAvatarPreview, setSettingsAvatarPreview] = useState<string | null>(channel.avatarUrl ?? null)
  const [settingsAvatarFile, setSettingsAvatarFile] = useState<File | null>(null)
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
    const msgs: Message[] = json.data ?? []
    setMessages(msgs)
    setLoading(false)
    // Расшифровываем сообщения с channelKey
    const toDecrypt = msgs.filter(m => m.iv.startsWith('ch:'))
    if (toDecrypt.length > 0) {
      const entries = await Promise.all(toDecrypt.map(async m => {
        const plain = await decryptFromChannel(m.ciphertext, m.iv, channel.id)
        return [m.id, plain ?? m.ciphertext] as const
      }))
      setDecrypted(new Map(entries))
    }
  }, [channel.id, decryptFromChannel])

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/channels/${channel.id}/members`)
    const json = await res.json()
    setMembers(json.data ?? [])
  }, [channel.id])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { if (showMembers) loadMembers() }, [showMembers, loadMembers])
  useEffect(() => {
    if (!isAtBottom) return
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 20 ? 'instant' : 'smooth' })
  }, [messages])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const cur = reactions.get(messageId) ?? []
    const existing = cur.find(r => r.emoji === emoji)
    if (existing?.mine) {
      await fetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' })
      setReactions(prev => { const n = new Map(prev); n.set(messageId, (n.get(messageId) ?? []).map(r => r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r).filter(r => r.count > 0)); return n })
    } else {
      await fetch(`/api/messages/${messageId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) })
      setReactions(prev => { const n = new Map(prev); const c = n.get(messageId) ?? []; const idx = c.findIndex(r => r.emoji === emoji); if (idx >= 0) { const u = [...c]; u[idx] = { ...u[idx], count: u[idx].count + 1, mine: true }; n.set(messageId, u) } else { n.set(messageId, [...c, { emoji, count: 1, mine: true }]) } return n })
    }
    setPressedId(null)
  }

  useSSE({
    message: (data) => {
      const msg = data as Message
      if (msg.channelId === channel.id) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        // Расшифровываем если зашифровано
        if (msg.iv.startsWith('ch:')) {
          decryptFromChannel(msg.ciphertext, msg.iv, channel.id).then(plain => {
            if (plain) setDecrypted(prev => new Map(prev).set(msg.id, plain))
          })
        }
      }
    },
  })

  async function sendMessage() {
    if (!text.trim() || sending) return
    setSending(true)
    const plaintext = text.trim()
    // Шифруем через channelKey если есть
    let ciphertext = plaintext
    let iv = 'plain-' + Date.now()
    const enc = await encryptForChannel(plaintext, channel.id)
    if (enc) { ciphertext = enc.ciphertext; iv = enc.iv }

    const optimistic: Message = {
      id: crypto.randomUUID(), senderId: currentUserId, channelId: channel.id,
      ciphertext: plaintext, iv: 'plain-' + Date.now(), createdAt: new Date().toISOString(),
      sender: { id: currentUserId, numericId: 0 },
    }
    setMessages(prev => [...prev, optimistic])
    setDecrypted(prev => new Map(prev).set(optimistic.id, plaintext))
    const replyToId = replyTo?.id ?? null
    setText('')
    setReplyTo(null)
    try {
      const res = await fetch(`/api/channels/${channel.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext, iv, replyToId }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? json.data : m))
        setDecrypted(prev => { const n = new Map(prev); n.delete(optimistic.id); n.set(json.data.id, plaintext); return n })
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } finally { setSending(false); inputRef.current?.focus() }
  }

  async function editMessage() {
    if (!editText.trim() || !editingId) return
    await fetch(`/api/messages/${editingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertext: editText.trim(), iv: 'plain-edit-' + Date.now() }),
    })
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, ciphertext: editText.trim(), editedAt: new Date().toISOString() } : m))
    setEditingId(null); setEditText('')
  }

  async function deleteMessage(msgId: string) {
    await fetch(`/api/messages/${msgId}`, { method: 'DELETE' })
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setPressedId(null)
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

  async function inviteUser(userId: string) {
    // Шифруем channelKey публичным ключом нового участника
    let encryptedChannelKey: string | undefined
    try {
      const keyRes = await fetch(`/api/users/${userId}/key`, { credentials: 'include' })
      const keyJson = await keyRes.json()
      const recipientPublicKey = keyJson.data?.publicKey
      if (recipientPublicKey) {
        encryptedChannelKey = await encryptKeyForUser(channel.id, recipientPublicKey) ?? undefined
      }
    } catch {}
    await fetch(`/api/channels/${channel.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, encryptedChannelKey }),
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
        const link = `${window.location.origin}/messages?invite=${channel.id}&token=${json.data.token}`
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
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim(), description: settingsDesc.trim() || null, isPrivate: settingsPrivate, type: settingsType, category: settingsCategory }),
      })
      const json = await res.json()
      if (json.data) {
        let avatarUrl = json.data.avatarUrl
        if (settingsAvatarFile) {
          const fd = new FormData()
          fd.append('avatar', settingsAvatarFile)
          const ar = await fetch(`/api/channels/${channel.id}/avatar`, { method: 'POST', body: fd })
          const aj = await ar.json()
          if (aj.avatarUrl) avatarUrl = aj.avatarUrl
          setSettingsAvatarFile(null)
        }
        onUpdate({ name: json.data.name, description: json.data.description, isPrivate: json.data.isPrivate, type: json.data.type, category: json.data.category, avatarUrl })
        setShowSettings(false)
      }
    } finally { setSettingsSaving(false) }
  }

  const canManage = channel.role === 'OWNER' || channel.role === 'ADMIN'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur-sm">
        <button type="button" onClick={onBack}
          className="flex size-8 items-center justify-center rounded-xl text-[--accent-brand] transition-opacity hover:opacity-70 md:hidden">
          <ArrowLeft className="size-5" strokeWidth={2.5} />
        </button>
        <button type="button" onClick={onBack}
          className="hidden md:flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-all">
          <ArrowLeft className="size-4" strokeWidth={1.5} />
        </button>
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
          <p className="text-xs text-muted-foreground">{channel.memberCount} участников</p>
        </div>
        <button type="button" onClick={() => { setShowMembers(v => !v); setShowSettings(false) }}
          className={cn('flex size-8 items-center justify-center rounded-xl transition-all', showMembers ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}>
          <Users className="size-4" strokeWidth={1.5} />
        </button>
        {/* Кнопки звонка */}
        <button type="button" onClick={() => startGroupCall(channel.id, channel.name, false)}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-all">
          <Phone className="size-4" strokeWidth={1.5} />
        </button>
        <button type="button" onClick={() => startGroupCall(channel.id, channel.name, true)}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-all">
          <Video className="size-4" strokeWidth={1.5} />
        </button>
        {/* Жалоба — только если не владелец */}
        {channel.role !== 'OWNER' && (
          <button type="button" onClick={() => setReportOpen(true)}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <Flag className="size-4" strokeWidth={1.5} />
          </button>
        )}
        {canManage && (
          <button type="button" onClick={() => { setShowSettings(v => !v); setShowMembers(false) }}
            className={cn('flex size-8 items-center justify-center rounded-xl transition-all', showSettings ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}>
            <Settings className="size-4" strokeWidth={1.5} />
          </button>
        )}
        {channel.role === 'OWNER' ? (
          <button type="button" onClick={() => onDelete(channel.id)}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        ) : channel.role ? (
          <button type="button" onClick={() => onLeave(channel.id)}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" onScroll={handleScroll}>
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Hash className="size-10 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">{t("channel.noMessages")}</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId
                const prev = messages[i - 1]
                const next = messages[i + 1]
                const sameAuthorPrev = prev?.senderId === msg.senderId
                const sameAuthorNext = next?.senderId === msg.senderId
                const senderName = msg.sender?.displayName || msg.sender?.username || `User ${msg.sender?.numericId ?? ''}`
                const isFirst = !sameAuthorPrev
                const isLast = !sameAuthorNext
                const msgReactions = reactions.get(msg.id) ?? []
                return (
                  <div key={msg.id} className={cn('group/msg flex items-end gap-1.5', isOwn ? 'justify-end' : 'justify-start', sameAuthorPrev ? 'mt-0.5' : 'mt-3')}>
                    {!isOwn && (
                      <div className="size-6 shrink-0 mb-0.5">
                        {isLast && (
                          <div className="size-6 overflow-hidden rounded-full bg-muted">
                            {msg.sender?.avatarUrl
                              ? <Image src={msg.sender?.avatarUrl} alt={senderName} width={24} height={24} className="size-full object-cover" />
                              : <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">{(senderName || "?").charAt(0).toUpperCase()}</div>
                            }
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                      {!isOwn && isFirst && (
                        <p className="mb-0.5 px-1 text-[10px] font-semibold text-[--accent-brand]">{senderName}</p>
                      )}
                      {editingId === msg.id ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-[--accent-brand]/40 bg-card px-3 py-2">
                          <input value={editText} onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') editMessage(); if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                            autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                          <button type="button" onClick={editMessage} className="text-[--accent-brand]"><Check className="size-4" strokeWidth={2.5} /></button>
                          <button type="button" onClick={() => { setEditingId(null); setEditText('') }} className="text-muted-foreground"><X className="size-4" strokeWidth={2} /></button>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'cursor-pointer select-text rounded-[18px] px-3 py-2 text-sm',
                            isOwn
                              ? [isFirst && isLast ? 'rounded-[18px]' : isFirst ? 'rounded-[18px] rounded-br-[4px]' : isLast ? 'rounded-[18px] rounded-tr-[4px]' : 'rounded-[18px] rounded-r-[4px]', 'bg-[--accent-brand] text-black'].join(' ')
                              : [isFirst && isLast ? 'rounded-[18px]' : isFirst ? 'rounded-[18px] rounded-bl-[4px]' : isLast ? 'rounded-[18px] rounded-tl-[4px]' : 'rounded-[18px] rounded-l-[4px]', 'bg-muted text-foreground dark:bg-[oklch(0.26_0_0)]'].join(' '),
                          )}
                          onContextMenu={e => {
                            e.preventDefault()
                            setMenuPos({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 300) })
                            setPressedId(pressedId === msg.id ? null : msg.id)
                          }}
                        >
                          {/* Reply preview */}
                          {(msg as any).replyTo && (
                            <div className={cn('mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px]', isOwn ? 'border-background/40 bg-background/10 text-background/70' : 'border-[--accent-brand] bg-[--accent-brand-muted] text-muted-foreground')}>
                              <p className="font-semibold text-[--accent-brand] truncate">{(msg as any).replyTo.sender?.displayName || (msg as any).replyTo.sender?.username || t("channel.user")}</p>
                              <p className="truncate opacity-80">{(msg as any).replyTo.ciphertext}</p>
                            </div>
                          )}
                          <p className="break-words leading-relaxed whitespace-pre-wrap">{decrypted.get(msg.id) ?? msg.ciphertext}</p>
                          <p className={cn('mt-0.5 text-[10px]', isOwn ? 'text-black/50 text-right' : 'text-muted-foreground')}>
                            {new Date(msg.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                            {msg.editedAt && ` · ${t("channel.edited")}`}
                          </p>
                        </div>
                      )}
                      {/* Реакции */}
                      {msgReactions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {msgReactions.map(r => (
                            <button key={r.emoji} type="button" onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all hover:scale-105', r.mine ? 'border-[--accent-brand] bg-[--accent-brand-muted] text-[--accent-brand]' : 'border-border bg-card text-foreground')}>
                              <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Кнопка быстрого ответа при hover */}
                    <button type="button"
                      onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                      className={cn('mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground opacity-0 transition-all group-hover/msg:opacity-100 hover:bg-muted hover:text-foreground active:scale-95', isOwn ? 'order-first' : 'order-last')}
                    >
                      <Reply className="size-3.5" strokeWidth={2} />
                    </button>

                    {/* Контекстное меню */}
                    {pressedId === msg.id && (
                      <>
                        <div className="fixed inset-0 z-[400]" onClick={() => setPressedId(null)} />
                        <div className="fixed z-[401] w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-xl" style={{ left: menuPos.x, top: menuPos.y }}>
                          <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
                            {EMOJI_QUICK.map(e => (
                              <button key={e} type="button" onClick={() => toggleReaction(msg.id, e)}
                                className={cn('flex size-8 items-center justify-center rounded-xl text-lg transition-all hover:scale-110 active:scale-95', reactions.get(msg.id)?.find(r => r.emoji === e)?.mine && 'bg-[--accent-brand-muted]')}>{e}</button>
                            ))}
                          </div>
                          <div className="p-1">
                            <button type="button" onClick={() => { setReplyTo(msg); setPressedId(null); inputRef.current?.focus() }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                              <Reply className="size-4 text-muted-foreground" strokeWidth={1.5} />Ответить
                            </button>
                            {isOwn && (
                              <button type="button" onClick={() => { setEditingId(msg.id); setEditText(msg.ciphertext); setPressedId(null) }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <Edit2 className="size-4 text-muted-foreground" strokeWidth={1.5} />Редактировать
                              </button>
                            )}
                            <div className="h-px bg-border mx-2 my-0.5" />
                            {(isOwn || canManage) && (
                              <button type="button" onClick={() => deleteMessage(msg.id)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                                <Trash2 className="size-4" strokeWidth={1.5} />Удалить
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-background/80 px-3 py-2 backdrop-blur-sm">
            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
                <Reply className="size-3.5 shrink-0 text-[--accent-brand]" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[--accent-brand]">{replyTo.sender.displayName || replyTo.sender.username || t("channel.user")}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{replyTo.ciphertext}</p>
                </div>
                <button type="button" onClick={() => setReplyTo(null)}><X className="size-3.5 text-muted-foreground" strokeWidth={2} /></button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-end rounded-full border border-border bg-muted/50 px-4 py-2">
                <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    if (e.key === 'Escape' && replyTo) { setReplyTo(null) }
                  }}
                  placeholder="Сообщение..." rows={1}
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
              <p className="text-sm font-semibold">{t("channel.settings")}</p>
              <button type="button" onClick={() => setShowSettings(false)}
                className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={saveSettings} className="flex flex-col gap-4 overflow-y-auto p-4">
              {/* Аватар */}
              <div className="flex items-center gap-3">
                <label className="relative cursor-pointer shrink-0">
                  <div className="size-16 overflow-hidden rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-[--accent-brand]/60 transition-colors">
                    {settingsAvatarPreview
                      ? <img src={settingsAvatarPreview} alt="" className="size-full object-cover" />
                      : channel.type === 'GROUP'
                        ? <MessagesSquare className="size-6 text-muted-foreground" strokeWidth={1.5} />
                        : <Hash className="size-6 text-muted-foreground" strokeWidth={1.5} />
                    }
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setSettingsAvatarFile(f)
                    setSettingsAvatarPreview(URL.createObjectURL(f))
                  }} />
                </label>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('channel.settings').split(' ')[0]}</label>
                  <input value={settingsName} onChange={e => setSettingsName(e.target.value)} maxLength={100}
                    className="h-9 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</label>
                <textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} maxLength={500} rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand]" />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div className={cn('flex size-5 items-center justify-center rounded-md border-2 transition-all', settingsPrivate ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border')}
                  onClick={() => setSettingsPrivate(v => !v)}>
                  {settingsPrivate && <Check className="size-3 text-black" strokeWidth={3} />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t("channel.private")}</p>
                  <p className="text-xs text-muted-foreground">{t("channel.privateDesc")}</p>
                </div>
              </label>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Тип</label>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button type="button" onClick={() => setSettingsType('CHANNEL')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', settingsType === 'CHANNEL' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Канал
                  </button>
                  <button type="button" onClick={() => setSettingsType('GROUP')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', settingsType === 'GROUP' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Группа
                  </button>
                </div>
              </div>
              {/* Категория — только для каналов */}
              {settingsType === 'CHANNEL' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Категория</label>
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
              )}
              {/* Invite link */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ссылка-приглашение</label>
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
                    {inviteLinkLoading ? '{t("channel.generatingLink")}' : '{t("channel.createLink")}'}
                  </button>
                )}
              </div>
              <button type="submit" disabled={settingsSaving || !settingsName.trim()}
                className="h-9 rounded-xl bg-[--accent-brand] text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition-all">
                {settingsSaving ? '{t("channel.saving")}' : '{t("channel.save")}'}
              </button>
            </form>
          </div>
        )}
        {showMembers && (
          <div className="w-64 shrink-0 border-l border-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{t("channel.participants")}</p>
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => { setShowContacts(v => !v); if (!showContacts) loadContacts() }}
                    className={cn('flex size-7 items-center justify-center rounded-lg transition-all', showContacts ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50')}
                    title="Добавить контакты">
                    <UserCheck className="size-3.5" strokeWidth={1.5} />
                  </button>
                  <div className="relative">
                    <input value={inviteQuery} onChange={e => searchInvite(e.target.value)}
                      placeholder="Поиск..." className="h-7 w-28 rounded-lg border border-border bg-muted/50 px-2 text-xs outline-none focus:border-[--accent-brand]" />
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
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("channel.contacts")}</p>
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
                const name = m.user?.displayName || m.user?.username || `User ${m.user?.numericId ?? ''}`
                const RoleIcon = ROLE_ICONS[m.role]
                const isMe = m.user.id === currentUserId
                return (
                  <div key={m.id} className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors">
                    <div className="relative shrink-0">
                      <div className="size-8 overflow-hidden rounded-full bg-muted">
                        {m.user.avatarUrl ? <Image src={m.user.avatarUrl} alt={name} width={32} height={32} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">{(name || '?').charAt(0).toUpperCase()}</div>}
                      </div>
                      {m.user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-green-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        {RoleIcon && <RoleIcon className="size-3 shrink-0 text-[--accent-brand]" strokeWidth={2} />}
                        <p className="truncate text-xs font-medium">{name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t(ROLE_LABELS[m.role] as never)}</p>
                    </div>
                    {canManage && !isMe && m.role !== 'OWNER' && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button type="button" onClick={() => changeRole(m.user.id, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                          className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground" title={m.role === 'ADMIN' ? t("channel.demote") : t("channel.promote")}>
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

      {reportOpen && (
        <ReportModal
          targetType="channel"
          targetId={channel.id}
          targetName={channel.name}
          onClose={() => setReportOpen(false)}
        />
      )}
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
  const { t, lang } = useTranslation()

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
    if (diff === 1) return t('time.yesterday')
    if (diff < 7) return d.toLocaleDateString(lang, { weekday: 'short' })
    return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })
  }

  return (
    <button type="button" onClick={() => onSelect(ch)}
      className={cn('group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.98]', selected?.id === ch.id ? 'bg-[--accent-brand-muted]' : 'hover:bg-muted/50')}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
        {ch.avatarUrl ? <Image src={ch.avatarUrl} alt={ch.name} width={44} height={44} className="size-full rounded-full object-cover" /> : ch.type === 'GROUP' ? <MessagesSquare className="size-5 text-muted-foreground" strokeWidth={1.5} /> : <Hash className="size-5 text-muted-foreground" strokeWidth={1.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <p className={cn('truncate text-sm font-semibold', selected?.id === ch.id && 'text-[--accent-brand]')}>{ch.name}</p>
            {ch.isPrivate && <Lock className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(ch.unreadCount ?? 0) > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-[--accent-brand] text-[10px] font-bold text-black">
                {(ch.unreadCount ?? 0) > 99 ? '99+' : ch.unreadCount}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{formatTime(ch.lastMessageAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="truncate text-xs text-muted-foreground">
            {ch.lastMessage
              ? ch.lastMessageSenderName
                ? <><span className="font-medium text-foreground/70">{ch.lastMessageSenderName}:</span>{' '}{ch.lastMessage}</>
                : ch.lastMessage
              : `${ch.memberCount} ${t('channel.membersShort').replace('{count}', '')}`
            }
          </p>
          {ch.role && ch.role !== null && (
            <div className="hidden group-hover:flex items-center ml-1">
              <button type="button" onClick={e => { e.stopPropagation(); ch.role === 'OWNER' ? onDelete(ch.id) : onLeave(ch.id) }}
                className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title={ch.role === 'OWNER' ? t('common.cancel') : t('common.back')}>
                {ch.role === 'OWNER' ? <Trash2 className="size-3" strokeWidth={1.5} /> : <X className="size-3" strokeWidth={2} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export type { Channel }

export function ChannelView({ currentUserId, initialChannelId, initialType, onClose }: {
  currentUserId: string
  initialChannelId?: string | null
  initialType?: 'CHANNEL' | 'GROUP' | null
  onClose?: () => void
}) {
  const { user } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const { t } = useTranslation()
  const [publicChannels, setPublicChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [creating, setCreating] = useState(!!initialType)
  const [channelType, setChannelType] = useState<'CHANNEL' | 'GROUP'>(initialType ?? 'CHANNEL')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [category, setCategory] = useState('other')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'news' | 'blogs' | 'memes' | 'other' | 'groups' | 'public'>('all')
  const [inviteJoining, setInviteJoining] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Если задан initialChannelId — работаем в embedded-режиме (только чат)
  const embedded = !!initialChannelId

  useEffect(() => {
    fetch('/api/channels').then(r => r.json()).then(d => {
      const list: Channel[] = d.data ?? []
      setChannels(list)
      if (initialChannelId) {
        const found = list.find(c => c.id === initialChannelId)
        if (found) { setSelected(found); setCreating(false) }
        else {
          // Не нашли в списке — загружаем напрямую
          fetch(`/api/channels/${initialChannelId}`).then(r => r.json()).then(d => {
            if (d.data) setSelected({ ...d.data, role: d.data.myRole ?? null, memberCount: d.data._count?.members ?? 0, lastMessageAt: new Date().toISOString(), category: d.data.category ?? 'other' })
          }).catch(() => null)
        }
      }
    }).finally(() => setLoading(false))
  }, [initialChannelId])

  useEffect(() => {
    if (activeTab === 'public') {
      fetch('/api/channels?public=1').then(r => r.json()).then(d => setPublicChannels(d.data ?? []))
    }
  }, [activeTab])

  // Handle invite link from URL: /messages?invite=ID&token=TOKEN
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
          window.history.replaceState({}, '', '/messages')
        } else {
          setInviteError(d.error ?? t("channel.invalidInvite"))
        }
      })
      .finally(() => setInviteJoining(false))
  }, [])

  const { createChannelKey } = useChannelCrypto()

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    // Генерируем channelKey и шифруем своим публичным ключом
    const keyData = await createChannelKey()
    const res = await fetch('/api/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), description: description.trim() || undefined,
        isPrivate, type: channelType, category,
        encryptedChannelKey: keyData?.encryptedForMe,
      }),
    })
    const json = await res.json()
    if (json.data) {
      let avatarUrl = json.data.avatarUrl
      // Загружаем аватарку если выбрана
      if (avatarFile) {
        const fd = new FormData()
        fd.append('avatar', avatarFile)
        const ar = await fetch(`/api/channels/${json.data.id}/avatar`, { method: 'POST', body: fd })
        const aj = await ar.json()
        if (aj.avatarUrl) avatarUrl = aj.avatarUrl
      }
      const ch = { ...json.data, avatarUrl, role: 'OWNER' as const, memberCount: 1, lastMessageAt: new Date().toISOString() }
      setChannels(prev => [ch, ...prev])
      setSelected(ch)
      setCreating(false); setName(''); setDescription(''); setIsPrivate(false); setChannelType('CHANNEL'); setCategory('other'); setAvatarPreview(null); setAvatarFile(null)
    }
    setSaving(false)
  }

  function handleSelectChannel(ch: Channel) {
    setSelected(ch)
    setCreating(false)
    setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, unreadCount: 0 } : c))
  }

  async function deleteChannel(id: string) {
    await fetch(`/api/channels/${id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) { setSelected(null); onClose?.() }
  }

  async function leaveChannel(id: string) {
    if (!user) return
    await fetch(`/api/channels/${id}/members/${user.id}`, { method: 'DELETE' })
    setChannels(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) { setSelected(null); onClose?.() }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-1 gap-3 overflow-hidden">

        {/* Боковой список — скрываем в embedded-режиме */}
        {!embedded && (
          <div className={cn('flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden', selected ? 'hidden md:flex w-64 shrink-0' : 'flex w-full md:w-64 md:shrink-0')}>
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <h1 className="font-[family-name:var(--font-syne)] text-lg font-black tracking-tight">{t("channel.title")}</h1>
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
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-xl bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[--accent-brand]/20"
                />
              </div>
            </div>

            {/* Tabs — таблетки как в TG */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none px-3 py-2 border-b border-border/60">
              {([
                ['all', t('channel.tabAll')],
                ['groups', t('channel.tabGroups')],
                ['news', t('channel.tabNews')],
                ['blogs', t('channel.tabBlogs')],
                ['memes', t('channel.tabMemes')],
                ['other', t('channel.tabOther')],
                ['public', t('channel.tabPublic')],
              ] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setActiveTab(val as typeof activeTab)}
                  className={cn(
                    'flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                    activeTab === val
                      ? 'bg-[--accent-brand] text-black'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}>
                  {label}
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
                  <button type="button" onClick={() => setInviteError(null)} className="text-xs text-muted-foreground hover:text-foreground">Закрыть</button>
                </div>
              ) : (() => {
                const source = activeTab === 'public' ? publicChannels : channels
                const filtered = source.filter(ch => {
                  const matchSearch = !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase())
                  if (!matchSearch) return false
                  if (activeTab === 'all') return true
                  if (activeTab === 'public') return true
                  if (activeTab === 'groups') return ch.type === 'GROUP'
                  // Категории — только каналы
                  return ch.type === 'CHANNEL' && (ch.category ?? 'other') === activeTab
                })
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
                    <p className="text-sm text-muted-foreground">{searchQuery ? '{t("search.empty")}' : '{t("channel.empty")}'}</p>
                    {!searchQuery && activeTab !== 'public' && <button type="button" onClick={() => setCreating(true)} className="rounded-xl bg-[--accent-brand] px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-all">{t("channel.create")}</button>}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map(ch => <ChannelRow key={ch.id} ch={ch} selected={selected} onSelect={handleSelectChannel} onDelete={deleteChannel} onLeave={leaveChannel} />)}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Main area */}
        <div className={cn('flex-1 flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden', !embedded && !selected && !creating ? 'hidden md:flex' : 'flex')}>
          {loading && embedded ? (
            <div className="flex h-full items-center justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
            </div>
          ) : selected ? (
            <>
              {/* Mobile back — только в не-embedded режиме */}
              {!embedded && (
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
                  <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-[--accent-brand]">
                    <ArrowLeft className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              )}
              <ChannelChat
                channel={selected}
                currentUserId={user?.id ?? ''}
                onBack={() => setSelected(null)}
                onDelete={deleteChannel}
                onLeave={leaveChannel}
                onUpdate={updates => {
                  setSelected(prev => prev ? { ...prev, ...updates } : prev)
                  setChannels(prev => prev.map(c => c.id === selected.id ? { ...c, ...updates } : c))
                }}
              />
            </>
          ) : creating ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-[family-name:var(--font-syne)] text-base font-bold">{channelType === "GROUP" ? t("channel.newGroupTitle") : t("channel.newChannelTitle")}</h2>
                <button type="button" onClick={() => setCreating(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" strokeWidth={1.5} /></button>
              </div>
              <form onSubmit={createChannel} className="flex flex-col gap-4 p-5 max-w-md overflow-y-auto flex-1">
                {/* Тип */}
                <div className="flex gap-2 rounded-xl border border-border overflow-hidden">
                  <button type="button" onClick={() => setChannelType('CHANNEL')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', channelType === 'CHANNEL' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Канал
                  </button>
                  <button type="button" onClick={() => setChannelType('GROUP')}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors', channelType === 'GROUP' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/40')}>
                    Группа
                  </button>
                </div>

                {/* Аватарка */}
                <div className="flex items-center gap-4">
                  <label className="relative cursor-pointer">
                    <div className="size-16 overflow-hidden rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-[--accent-brand]/60 transition-colors">
                      {avatarPreview
                        ? <img src={avatarPreview} alt="" className="size-full object-cover" />
                        : channelType === 'GROUP'
                          ? <MessagesSquare className="size-6 text-muted-foreground" strokeWidth={1.5} />
                          : <Hash className="size-6 text-muted-foreground" strokeWidth={1.5} />
                      }
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setAvatarFile(f)
                      setAvatarPreview(URL.createObjectURL(f))
                    }} />
                  </label>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Название</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder={channelType === "GROUP" ? t("channel.namePlaceholderGroup") : t("channel.namePlaceholderChannel")} maxLength={100}
                      className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                  </div>
                </div>

                {/* Описание */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder={ channelType === "GROUP" ? t("channel.descPlaceholderGroup") : t("channel.descPlaceholderChannel")} maxLength={500} rows={2}
                    className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>

                {/* {t("channel.private")} */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className={cn('flex size-5 items-center justify-center rounded-md border-2 transition-all', isPrivate ? 'border-[--accent-brand] bg-[--accent-brand]' : 'border-border')} onClick={() => setIsPrivate(v => !v)}>
                    {isPrivate && <Check className="size-3 text-black" strokeWidth={3} />}
                  </div>
                  <div><p className="text-sm font-medium">{t("channel.private")}</p><p className="text-xs text-muted-foreground">{t("channel.privateDesc")}</p></div>
                </label>

                {/* Категория — только для каналов */}
                {channelType === 'CHANNEL' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Категория</label>
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
                  {saving ? 'Создаём...' : channelType === 'GROUP' ? '{t("channel.create")} группу' : '{t("channel.create")} канал'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted"><Hash className="size-7 text-muted-foreground" strokeWidth={1} /></div>
              <p className="text-sm font-medium">{t("channel.select")}</p>
              <p className="text-xs text-muted-foreground">{t("channel.selectDesc")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}