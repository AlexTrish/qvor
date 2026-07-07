'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { OnlineStatus } from '@/components/OnlineStatus'
import {
  ArrowLeft, Send, Edit2, Trash2, X, Check, CheckCheck, MessageCircle, Lock, Star, Mic,
  Search, MoreVertical, UserCircle, Bell, Ban, Eraser, Reply, Forward, Copy, Pin, PinOff, CheckSquare, Square, MessageSquare, Phone, Video, PhoneOff, PhoneMissed,
} from 'lucide-react'

function CallLogBubble({ callType, callDuration, isOwn, time }: {
  callType: 'audio' | 'video'
  callDuration: number | null
  isOwn: boolean
  time: string
}) {
  const { t } = useTranslation()
  const missed = callDuration === null
  function fmt(s: number) {
    if (s < 60) return `${s} ${t('call.sec')}`
    const m = Math.floor(s / 60), sec = s % 60
    return sec > 0 ? `${m} ${t('call.min')} ${sec} ${t('call.sec')}` : `${m} ${t('call.min')}`
  }
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full',
        missed ? 'bg-destructive/15' : isOwn ? 'bg-background/20' : 'bg-[--accent-brand-muted]',
      )}>
        {missed
          ? <PhoneMissed className={cn('size-4', isOwn ? 'text-background/70' : 'text-destructive')} strokeWidth={2} />
          : callType === 'video'
            ? <Video className={cn('size-4', isOwn ? 'text-background/70' : 'text-[--accent-brand]')} strokeWidth={2} />
            : <Phone className={cn('size-4', isOwn ? 'text-background/70' : 'text-[--accent-brand]')} strokeWidth={2} />
        }
      </div>
      <div className="flex flex-col min-w-0">
        <span className={cn('text-sm font-medium', isOwn ? 'text-background/90' : 'text-foreground')}>
          {missed ? (isOwn ? t('call.cancelled') : t('call.missed')) : callType === 'video' ? t('call.video') : t('call.audio')}
        </span>
        <span className={cn('text-[10px]', isOwn ? 'text-background/50' : 'text-muted-foreground')}>
          {missed ? time : `${fmt(callDuration!)} · ${time}`}
        </span>
      </div>
    </div>
  )
}
import type { Message } from '@/hooks/useMessages'
import { loadPrivateKey, encryptMessage, decryptMessage } from '@/lib/crypto/e2e'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useSSE } from '@/hooks/useSSE'
import { MessageSkeleton } from '@/components/Skeletons'
import { MarkdownText } from '@/components/MarkdownText'
import { EmojiPicker } from '@/components/EmojiPicker'
import { VoiceMicButton, VoiceRecordingBar, VoicePlayer, useVoiceRecorder } from '@/components/VoiceMessage'
import { MediaAttachment } from '@/components/MediaAttachment'
import { MediaUploadButton, type UploadedMedia } from '@/components/MediaUploadButton'
import { useCall } from '@/components/CallProvider'
import { sounds } from '@/lib/sounds'

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

type Reaction = { emoji: string; count: number; mine: boolean; users: string[] }

type SelectedUser = {
  id: string
  numericId: number
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  isOnline: boolean
  lastSeenAt?: string | null
}

type ChatViewProps = {
  messages: Message[]
  currentUserId: string
  myAvatarUrl?: string | null
  selectedUser: SelectedUser | null
  onBack: () => void
  onSendMessage: (ciphertext: string, iv: string, replyToId?: string | null, forwardFrom?: { userId: string; displayName: string | null; username: string | null } | null, plaintext?: string, mentions?: string[] | null, media?: { mediaUrl: string; mediaType: string; mediaName: string; mediaSize: number } | null) => Promise<unknown>
  onEditMessage: (messageId: string, ciphertext: string, iv: string) => Promise<unknown>
  onDeleteMessage: (messageId: string, mode?: 'self' | 'all') => Promise<boolean>
  onTyping?: (isTyping: boolean) => void
  typingUsers?: Set<string>
  loading?: boolean
  pinnedMessage?: import('@/hooks/useMessages').Message | null
  newMsgIds?: Set<string>
}

function isEncrypted(iv: string): boolean {
  return !!iv && !iv.startsWith('plain-') && !iv.startsWith('iv-') && !iv.startsWith('mock') && iv !== 'voice' && iv !== 'call'
}

// Detect if text is a single emoji
function isSingleEmoji(text: string): boolean {
  const trimmed = text.trim()
  // Match single emoji (including compound emojis with ZWJ)
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u
  return emojiRegex.test(trimmed) && trimmed.length <= 8
}

// Notification modal
type NotifDuration = '30m' | '1h' | '8h' | '24h' | 'forever'
const NOTIF_OPTIONS: { value: NotifDuration; label: string }[] = [
  { value: '30m', label: '30 минут' },
  { value: '1h', label: '1 час' },
  { value: '8h', label: '8 часов' },
  { value: '24h', label: '24 часа' },
  { value: 'forever', label: 'Навсегда' },
]

function NotificationsModal({ open, muted, onClose, onMute, onUnmute }: {
  open: boolean
  muted: boolean
  onClose: () => void
  onMute: (duration: NotifDuration) => void
  onUnmute: () => void
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-semibold text-sm">Уведомления</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-3 space-y-1">
          {muted ? (
            <button type="button" onClick={onUnmute}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors">
              <Bell className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
              {t("notif.enable")}
            </button>
          ) : (
            <>
              <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("notif.muteFor")}</p>
              {NOTIF_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => onMute(opt.value)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                  <Bell className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  {opt.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Forward modal — shows conversation list
type ForwardConv = { id: string; name: string; avatarUrl?: string | null }
function ForwardModal({ open, conversations, onClose, onSelect }: {
  open: boolean
  conversations: ForwardConv[]
  onClose: () => void
  onSelect: (conv: ForwardConv) => void
}) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  if (!open) return null
  const filtered = q ? conversations.filter(c => c.name.toLowerCase().includes(q.toLowerCase())) : conversations
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-semibold text-sm">{t("notif.title")}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-3 py-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск..."
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand]" />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered.map(conv => (
            <button key={conv.id} type="button" onClick={() => onSelect(conv)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
              <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                {conv.avatarUrl
                  ? <Image src={conv.avatarUrl} alt="" width={36} height={36} className="size-full object-cover" />
                  : <span className="text-sm font-bold text-muted-foreground">{(conv.name || '?').charAt(0).toUpperCase()}</span>
                }
              </div>
              <span className="truncate font-medium">{conv.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatView({
  messages, currentUserId, selectedUser,
  onBack, onSendMessage, onEditMessage, onDeleteMessage,
  onTyping, typingUsers, loading, pinnedMessage,
  myAvatarUrl, newMsgIds,
}: ChatViewProps) {
  const { startCall } = useCall()
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map())
  const [theirPublicKey, setTheirPublicKey] = useState<string | null>(null)
  const [decrypted, setDecrypted] = useState<Map<string, string>>(new Map())
  const [e2eReady, setE2eReady] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [forwardConvs, setForwardConvs] = useState<ForwardConv[]>([])
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showNotifModal, setShowNotifModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  // Выделение сообщений
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  // Удаление одного сообщения
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null)
  const [deleteMsgIsOwn, setDeleteMsgIsOwn] = useState(false)
  // Закрепление
  const [pinMsgId, setPinMsgId] = useState<string | null>(null)
  const [localPinned, setLocalPinned] = useState<Message | null>(null)
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null)
  const [threadReplies, setThreadReplies] = useState<any[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadBelow, setUnreadBelow] = useState(0)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<{ id: string; username?: string | null; displayName?: string | null; avatarUrl?: string | null }[]>([])
  const [swipeReplyId, setSwipeReplyId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const voiceRecorder = useVoiceRecorder()
  const [pendingMedia, setPendingMedia] = useState<UploadedMedia | null>(null)

  // WebRTC
  const [callConfirm, setCallConfirm] = useState<{ video: boolean } | null>(null)
  const [callPeerName, setCallPeerName] = useState('')
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isFavorites = selectedUser?.id === currentUserId

  // Горячие клавиши TG-стиль
  useEffect(() => {
    function h(e: KeyboardEvent) {
      // Escape — сброс режимов
      if (e.key === 'Escape') {
        if (pressedId) { setPressedId(null); return }
        if (selectMode) { setSelectMode(false); setSelected(new Set()); return }
        if (replyTo) { setReplyTo(null); return }
        if (searchOpen) { setSearchOpen(false); setSearchQuery(''); return }
        if (editingId) { setEditingId(null); setEditText(''); return }
        if (mentionQuery !== null) { setMentionQuery(null); return }
      }
      // Ctrl+F — поиск
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(v => !v)
        return
      }
      // Ctrl+K — фокус на инпут
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [pressedId, selectMode, replyTo, searchOpen, editingId, mentionQuery])

  // Поиск упоминаний @
  useEffect(() => {
    if (mentionQuery === null || isFavorites) { setMentionResults([]); return }
    if (!mentionQuery) {
      // Показываем собеседника сразу
      if (selectedUser) setMentionResults([{ id: selectedUser.id, username: selectedUser.username, displayName: selectedUser.displayName, avatarUrl: selectedUser.avatarUrl }])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`)
        const json = await res.json()
        setMentionResults(json.data?.slice(0, 5) ?? [])
      } catch { setMentionResults([]) }
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionQuery, selectedUser, isFavorites])

  // SSE — только сообщения (звонки обрабатываются глобально в AppNav)
  useSSE({
    message: (data: any) => {
      if (data?.senderId && data.senderId !== currentUserId) {
        const isCurrentChat = data.senderId === selectedUser?.id || data.receiverId === selectedUser?.id
        if (isCurrentChat) {
          sounds.messageInChat()
        } else {
          sounds.messageOutChat()
        }
      }
    },
  })

  // Фильтр сообщений по поиску (computed before early return to avoid hook order issues)
  const visibleMessages = searchQuery.trim()
    ? messages.filter(m => {
        const txt = decrypted.get(m.id) ?? m.ciphertext
        return txt.toLowerCase().includes(searchQuery.toLowerCase())
      })
    : messages

  const displayName = isFavorites
    ? t("chat.favorites")
    : (selectedUser?.displayName || selectedUser?.username || `User ${selectedUser?.numericId ?? ''}`)
  const profileHref = selectedUser?.username ? `/${selectedUser.username}` : `/id${selectedUser?.numericId}`

  // Синхронизируем localPinned с prop
  useEffect(() => {
    setLocalPinned(pinnedMessage ?? null)
  }, [pinnedMessage])

  useEffect(() => {
    if (!menuOpen) return
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  useEffect(() => {
    if (!selectedUser) return
    setReplyTo(null)
    setForwardMsg(null)
    setShowForwardModal(false)
    setSearchOpen(false)
    setSearchQuery('')
    setMenuOpen(false)
    setTheirPublicKey(null)
    setE2eReady(false)
    setDecrypted(new Map())
    setSelected(new Set())
    setSelectMode(false)
    setLocalPinned(null)
    setIsAtBottom(true)
    setUnreadBelow(0)
    initialScrollDone.current = false  // сбрасываем при смене чата
    if (isFavorites) {
      // Для Избранного — шифруем своим же публичным ключом
      apiFetch(`/api/users/${currentUserId}/key`)
        .then(r => r.json())
        .then(d => { if (d.data?.publicKey) { setTheirPublicKey(d.data.publicKey); setE2eReady(true) } })
        .catch(() => null)
      return
    }
    apiFetch(`/api/users/${selectedUser.id}/key`)
      .then(r => r.json())
      .then(d => { if (d.data?.publicKey) { setTheirPublicKey(d.data.publicKey); setE2eReady(true) } })
      .catch(() => null)
  }, [selectedUser?.id, isFavorites])

  useEffect(() => {
    if (!theirPublicKey || !currentUserId || !messages.length) return
    let cancelled = false
    async function decryptNew() {
      const pk = await loadPrivateKey(currentUserId)
      if (!pk || !theirPublicKey || cancelled) return
      // Расшифровываем только новые сообщения, которых ещё нет в кэше
      const toDecrypt = messages.filter(m => !decrypted.has(m.id))
      if (!toDecrypt.length) return
      const entries = await Promise.all(toDecrypt.map(async msg => {
        if (!isEncrypted(msg.iv)) return [msg.id, msg.ciphertext] as const
        if ((msg as any).voiceUrl || msg.iv === 'voice') return [msg.id, ''] as const
        try {
          const plain = await decryptMessage(msg.ciphertext, msg.iv, pk, theirPublicKey!)
          return [msg.id, plain] as const
        } catch { return [msg.id, '🔒'] as const }
      }))
      if (!cancelled) setDecrypted(prev => {
        const next = new Map(prev)
        entries.forEach(([id, text]) => next.set(id, text))
        return next
      })
    }
    decryptNew()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, theirPublicKey, currentUserId])

  // При замене оптимистичного ID на реальный — переносим запись в decrypted
  const prevMessagesRef = useRef<Message[]>([])
  useEffect(() => {
    const prev = prevMessagesRef.current
    const curr = messages
    if (prev.length === curr.length && prev.length > 0) {
      // Ищем заменённые сообщения (оптимистичный ID → реальный)
      curr.forEach((msg, i) => {
        const old = prev[i]
        if (old && old.id !== msg.id && decrypted.has(old.id)) {
          setDecrypted(d => {
            const next = new Map(d)
            next.set(msg.id, next.get(old.id)!)
            return next
          })
        }
      })
    }
    prevMessagesRef.current = curr
  }, [messages])

  // Инициализируем реакции из messages
  useEffect(() => {
    if (!messages.length) return
    setReactions(prev => {
      const next = new Map(prev)
      for (const msg of messages) {
        if ((msg as any).reactions && !next.has(msg.id)) {
          next.set(msg.id, (msg as any).reactions)
        }
      }
      return next
    })
  }, [messages])

  async function toggleReaction(messageId: string, emoji: string) {
    const msgReactions = reactions.get(messageId) ?? []
    const existing = msgReactions.find(r => r.emoji === emoji)
    if (existing?.mine) {
      await apiFetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' })
      setReactions(prev => {
        const next = new Map(prev)
        const updated = (next.get(messageId) ?? []).map(r =>
          r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r
        ).filter(r => r.count > 0)
        next.set(messageId, updated)
        return next
      })
    } else {
      await apiFetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
      })
      setReactions(prev => {
        const next = new Map(prev)
        const cur = next.get(messageId) ?? []
        const idx = cur.findIndex(r => r.emoji === emoji)
        if (idx >= 0) {
          const updated = [...cur]
          updated[idx] = { ...updated[idx], count: updated[idx].count + 1, mine: true }
          next.set(messageId, updated)
        } else {
          next.set(messageId, [...cur, { emoji, count: 1, mine: true, users: [] }])
        }
        return next
      })
    }
    setEmojiPickerId(null)
  }

  const initialScrollDone = useRef(false)

  // Умный автоскролл — скроллим контейнер напрямую, без scrollIntoView
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !messages.length) return

    if (!initialScrollDone.current) {
      // Первая загрузка — мгновенно в конец
      container.scrollTop = container.scrollHeight
      // Дополнительный запуск через rAF на случай если изображения ещё грузятся
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      })
      initialScrollDone.current = true
    } else if (isAtBottom) {
      container.scrollTop = container.scrollHeight
    } else {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.senderId !== currentUserId) {
        setUnreadBelow(v => v + 1)
      }
    }
  }, [messages])

  // Отслеживаем позицию скролла
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    if (atBottom) setUnreadBelow(0)
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  async function handleSend() {
    if (!text.trim() && !pendingMedia || !selectedUser || sending) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    onTyping?.(false)
    setSending(true)
    const replyToId = replyTo?.id ?? null
    const fwd = forwardMsg ? {
      userId: forwardMsg.sender.id,
      displayName: forwardMsg.sender.displayName ?? null,
      username: forwardMsg.sender.username ?? null,
    } : null
    const mentionMatches = text.match(/@([a-zA-Z][a-zA-Z0-9_]{2,19})/g)
    const mentions = mentionMatches ? mentionMatches.map(m => m.slice(1)) : null
    const media = pendingMedia ? {
      mediaUrl: pendingMedia.url,
      mediaType: pendingMedia.mediaType,
      mediaName: pendingMedia.mediaName,
      mediaSize: pendingMedia.mediaSize,
    } : null
    try {
      const msgText = text.trim() || (pendingMedia ? `[${pendingMedia.mediaType}]` : '')
      let ciphertext = msgText
      let iv = 'plain-' + Date.now()
      if (e2eReady && theirPublicKey) {
        const pk = await loadPrivateKey(currentUserId)
        if (pk) {
          const enc = await encryptMessage(msgText, pk, theirPublicKey)
          ciphertext = enc.ciphertext; iv = enc.iv
        }
      }
      await onSendMessage(ciphertext, iv, replyToId, fwd, msgText, mentions, media)
      sounds.messageSent()
      setText('')
      setPendingMedia(null)
      setReplyTo(null)
      setForwardMsg(null)
      if (inputRef.current) inputRef.current.style.height = 'auto'
    } finally { setSending(false); inputRef.current?.focus() }
  }

  async function handleEdit() {
    if (!editText.trim() || !editingId) return
    let ciphertext = editText.trim()
    let iv = 'plain-edit-' + Date.now()
    if (e2eReady && theirPublicKey) {
      const pk = await loadPrivateKey(currentUserId)
      if (pk) {
        const enc = await encryptMessage(editText.trim(), pk, theirPublicKey)
        ciphertext = enc.ciphertext; iv = enc.iv
      }
    }
    await onEditMessage(editingId, ciphertext, iv)
    setEditingId(null); setEditText('')
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id)
    setEditText(decrypted.get(msg.id) ?? msg.ciphertext)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return t('time.today')
    if (d.toDateString() === yesterday.toDateString()) return t('time.yesterday')
    return d.toLocaleDateString(lang, { day: 'numeric', month: 'long' })
  }

  const groups: { date: string; msgs: Message[] }[] = []
  for (const msg of visibleMessages) {
    const d = formatDate(msg.createdAt)
    if (!groups.length || groups[groups.length - 1].date !== d) groups.push({ date: d, msgs: [msg] })
    else groups[groups.length - 1].msgs.push(msg)
  }

  if (!selectedUser) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="size-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium">{t('chat.selectConversation')}</p>
        <p className="text-xs text-muted-foreground">{t('chat.selectConversationDesc')}</p>
      </div>
    )
  }

  async function openThread(msgId: string) {
    setThreadMsgId(msgId)
    setThreadLoading(true)
    try {
      const res = await apiFetch(`/api/messages/${msgId}/thread`)
      const json = await res.json()
      setThreadReplies(json.data?.replies ?? [])
    } finally { setThreadLoading(false) }
  }

  async function clearChat() {
    await apiFetch('/api/messages/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: selectedUser!.id, mode: 'clear' }),
    })
    setMenuOpen(false)
  }

  async function deleteChat(mode: 'clear' | 'delete') {
    await apiFetch('/api/messages/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: selectedUser!.id, mode }),
    })
    setShowDeleteModal(false)
    setMenuOpen(false)
    if (mode === 'delete') onBack()
  }

  async function blockUser() {
    await apiFetch(`/api/users/${selectedUser!.id}/block`, { method: 'POST' })
    setMenuOpen(false)
  }

  async function pinMessage(msgId: string, mode: 'self' | 'all') {
    await apiFetch(`/api/messages/${msgId}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    const msg = messages.find(m => m.id === msgId) ?? null
    setLocalPinned(msg)
    setPinMsgId(null)
  }

  async function unpinMessage() {
    if (!localPinned) return
    await apiFetch(`/api/messages/${localPinned.id}/pin`, { method: 'DELETE' })
    setLocalPinned(null)
  }

  function copyMessage(msgId: string) {
    const text = decrypted.get(msgId) ?? messages.find(m => m.id === msgId)?.ciphertext ?? ''
    navigator.clipboard.writeText(text).catch(() => null)
    setPressedId(null)
  }

  function toggleSelect(msgId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  async function deleteSelected(mode: 'self' | 'all') {
    await Promise.all([...selected].map(id => onDeleteMessage(id, mode)))
    setSelected(new Set())
    setSelectMode(false)
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* ── Header TG-style ── */}
      <div className="flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur-sm">
        {/* Left: back (mobile) + search */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={onBack}
            className="flex size-8 items-center justify-center rounded-xl text-[--accent-brand] transition-opacity hover:opacity-70 md:hidden">
            <ArrowLeft className="size-5" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => { setSearchOpen(v => !v); setSearchQuery('') }}
            className={cn(
              'flex size-8 items-center justify-center rounded-xl transition-all duration-150',
              searchOpen ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}>
            <Search className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Center: avatar + name + status */}
        <div className="flex flex-1 items-center justify-center gap-2.5">
          <div className="relative shrink-0">
            {isFavorites ? (
              <div className="size-9 rounded-full bg-[--accent-brand] flex items-center justify-center">
                <Star className="size-4 text-black" strokeWidth={2} fill="black" />
              </div>
            ) : (
              <Link href={profileHref} className="block">
                <div className="size-9 overflow-hidden rounded-full bg-muted">
                  {selectedUser.avatarUrl ? (
                    <Image src={selectedUser.avatarUrl} alt={displayName} width={36} height={36} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                      {(displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-[13px] font-semibold leading-tight">{displayName}</p>
            {!isFavorites && (
              typingUsers && typingUsers.size > 0
                ? <p className="text-[11px] text-[--accent-brand] animate-pulse">печатает...</p>
                : <OnlineStatus isOnline={selectedUser.isOnline} lastSeenAt={selectedUser.lastSeenAt} size="sm" />
            )}
          </div>
        </div>

        {/* Right: E2E + call buttons + 3-dot menu */}
        <div className="flex items-center gap-1" ref={menuRef}>
          {e2eReady && <Lock className="size-3.5 text-green-500" strokeWidth={2} />}
          {!isFavorites && (
            <>
              <button type="button"
                onClick={() => { setCallPeerName(displayName); setCallPeerAvatar(selectedUser?.avatarUrl ?? null); setCallConfirm({ video: false }) }}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                title="Аудиозвонок">
                <Phone className="size-4" strokeWidth={1.5} />
              </button>
              <button type="button"
                onClick={() => { setCallPeerName(displayName); setCallPeerAvatar(selectedUser?.avatarUrl ?? null); setCallConfirm({ video: true }) }}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                title="Видеозвонок">
                <Video className="size-4" strokeWidth={1.5} />
              </button>
            </>
          )}
          {!isFavorites && (
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen(v => !v)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground">
                <MoreVertical className="size-4" strokeWidth={1.5} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <Link href={profileHref} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
                    <UserCircle className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    {t("chat.openProfile")}
                  </Link>
                  <button type="button" onClick={() => { setMenuOpen(false); setShowNotifModal(true) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
                    <Bell className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    Уведомления
                  </button>
                  <div className="h-px bg-border" />
                  <button type="button" onClick={clearChat}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
                    <Eraser className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    {t("chat.clearHistory")}
                  </button>
                  <div className="h-px bg-border" />
                  <button type="button" onClick={blockUser}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <Ban className="size-4" strokeWidth={1.5} />
                    {t("chat.blockUser")}
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); setShowDeleteModal(true) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                    Удалить диалог
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-b border-border bg-background px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по сообщениям..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}>
                <X className="size-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pinned message bar */}
      {localPinned && !selectMode && (
        <div className="flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => {
            const el = document.getElementById(`msg-${localPinned.id}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}>
          <Pin className="size-3.5 shrink-0 text-[--accent-brand]" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-[--accent-brand]">$1{t("$2")}$3</p>
            <p className="truncate text-xs text-muted-foreground">
              {decrypted.get(localPinned.id) ?? '…'}
            </p>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); unpinMessage() }}
            className="flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Select mode toolbar */}
      {selectMode && (
        <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
          <button type="button" onClick={() => { setSelectMode(false); setSelected(new Set()) }}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={2} />
          </button>
          <span className="flex-1 text-sm font-medium">{selected.size} выбрано</span>
          {selected.size > 0 && (
            <>
              <button type="button" onClick={() => {
                const msgs = [...selected].map(id => messages.find(m => m.id === id)).filter(Boolean)
                const text = msgs.map(m => decrypted.get(m!.id) ?? m!.ciphertext).join('\n')
                navigator.clipboard.writeText(text).catch(() => null)
              }}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <Copy className="size-4" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => setDeleteMsgId('__selected__')}
                className="flex size-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      {/* Кнопка "вниз" с счётчиком */}
      {!isAtBottom && (
        <div className="absolute bottom-20 right-4 z-30">
          <button
            type="button"
            onClick={() => {
              const c = messagesContainerRef.current
              if (c) c.scrollTop = c.scrollHeight
              setUnreadBelow(0)
            }}
            className="relative flex size-10 items-center justify-center rounded-full bg-background border border-border shadow-lg text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
          >
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            {unreadBelow > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[--accent-brand] text-[9px] font-bold text-black">
                {unreadBelow > 99 ? '99+' : unreadBelow}
              </span>
            )}
          </button>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" onScroll={handleScroll}>
        {loading ? (
          <MessageSkeleton />
        ) : visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">{searchQuery ? 'Ничего не найдено' : t('chat.noMessages')}</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center py-3">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {group.date}
                </span>
              </div>

              {group.msgs.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId
                const isEditing = editingId === msg.id
                const prevMsg = group.msgs[i - 1]
                const nextMsg = group.msgs[i + 1]
                const isSameAuthorPrev = prevMsg?.senderId === msg.senderId
                const isSameAuthorNext = nextMsg?.senderId === msg.senderId
                const isVoice = !!(msg as any).voiceUrl
                const isCallMsg = !!(msg as any).callType
                const isMedia = !!(msg as any).mediaUrl
                const displayText = (isVoice || isCallMsg) ? '' : (decrypted.get(msg.id) ?? (isEncrypted(msg.iv) ? null : msg.ciphertext))
                const singleEmoji = !isVoice && !isCallMsg && !isMedia && displayText ? isSingleEmoji(displayText) : false

                // iOS bubble tail logic
                const isFirst = !isSameAuthorPrev
                const isLast = !isSameAuthorNext

                const bubbleClass = (singleEmoji || isCallMsg) ? '' : isOwn
                  ? [
                      'msg-own ring-1 ring-foreground/20',
                      isFirst && isLast ? 'rounded-[20px]' :
                      isFirst ? 'rounded-[20px] rounded-br-[6px]' :
                      isLast ? 'rounded-[20px] rounded-tr-[6px]' :
                      'rounded-[20px] rounded-r-[6px]',
                    ].join(' ')
                  : [
                      'bg-muted text-foreground ring-1 ring-border/50 dark:bg-[oklch(0.26_0_0)] dark:ring-[oklch(1_0_0/15%)]',
                      isFirst && isLast ? 'rounded-[20px]' :
                      isFirst ? 'rounded-[20px] rounded-bl-[6px]' :
                      isLast ? 'rounded-[20px] rounded-tl-[6px]' :
                      'rounded-[20px] rounded-l-[6px]',
                    ].join(' ')

                return (
                  <div key={msg.id} id={`msg-${msg.id}`}
                    className={[
                      'flex items-end gap-1.5 group/msg',
                      isOwn ? 'justify-end' : 'justify-start',
                      isSameAuthorPrev ? 'mt-0.5' : 'mt-2',
                      selectMode && selected.has(msg.id) ? 'bg-[--accent-brand-muted]/30 rounded-xl px-1' : '',
                      newMsgIds?.has(msg.id) ? (isOwn ? 'msg-animate-own' : 'msg-animate-other') : '',
                    ].join(' ')}
                    onTouchStart={e => {
                      if (selectMode) return
                      const touch = e.touches[0]
                      ;(e.currentTarget as any)._swipeStartX = touch.clientX
                      ;(e.currentTarget as any)._swipeStartY = touch.clientY
                    }}
                    onTouchMove={e => {
                      if (selectMode) return
                      const el = e.currentTarget as any
                      const dx = e.touches[0].clientX - (el._swipeStartX ?? 0)
                      const dy = Math.abs(e.touches[0].clientY - (el._swipeStartY ?? 0))
                      if (dy > 20) return // вертикальный скролл
                      const swipeRight = !isOwn && dx > 0
                      const swipeLeft = isOwn && dx < 0
                      if ((swipeRight || swipeLeft) && Math.abs(dx) > 40) {
                        setSwipeReplyId(msg.id)
                      }
                    }}
                    onTouchEnd={() => {
                      if (swipeReplyId === msg.id) {
                        setReplyTo(msg)
                        setSwipeReplyId(null)
                        inputRef.current?.focus()
                      }
                    }}
                  >

                    {/* Чекбокс выделения */}
                    {selectMode && (
                      <button type="button" onClick={() => toggleSelect(msg.id)}
                        className="shrink-0 flex items-center justify-center size-5 text-[--accent-brand]">
                        {selected.has(msg.id)
                          ? <CheckSquare className="size-5" strokeWidth={2} />
                          : <Square className="size-5 text-muted-foreground" strokeWidth={1.5} />}
                      </button>
                    )}

                    {/* Avatar placeholder for alignment */}
                    {!isOwn && (
                      <div className="size-6 shrink-0 mb-0.5">
                        {isLast && !isFavorites && (
                          <div className="size-6 overflow-hidden rounded-full bg-muted">
                            {selectedUser.avatarUrl ? (
                              <Image src={selectedUser.avatarUrl} alt={displayName} width={24} height={24} className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                                {(displayName || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={['flex max-w-[65%] sm:max-w-[72%] flex-col', isOwn ? 'items-end' : 'items-start'].join(' ')}>
                      {isEditing ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-[--accent-brand]/40 bg-card px-3 py-2">
                          <input value={editText} onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                            autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                          <button type="button" onClick={handleEdit} className="text-[--accent-brand]">
                            <Check className="size-4" strokeWidth={2.5} />
                          </button>
                          <button type="button" onClick={() => { setEditingId(null); setEditText('') }} className="text-muted-foreground">
                            <X className="size-4" strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'cursor-pointer select-text',
                            singleEmoji ? 'px-1 py-0.5' : isCallMsg ? 'px-2 py-1.5' : ['px-3 py-2 text-sm', bubbleClass].join(' '),
                          )}
                          onDoubleClick={() => isOwn && !selectMode && startEdit(msg)}
                          onContextMenu={e => {
                            e.preventDefault()
                            if (selectMode) { toggleSelect(msg.id); return }
                            const x = Math.min(e.clientX, window.innerWidth - 220)
                            const y = Math.min(e.clientY, window.innerHeight - 400)
                            setMenuPos({ x, y })
                            setPressedId(pressedId === msg.id ? null : msg.id)
                          }}
                        >
                          {/* Forward banner */}
                          {msg.forwardFrom && (
                            <div className={cn(
                              'mb-1.5 border-l-2 pl-2 text-[11px]',
                              isOwn ? 'border-background/30 text-background/60' : 'border-[--accent-brand] text-[--accent-brand]',
                            )}>
                              Переслано от{' '}
                              <span className="font-semibold">
                                {msg.forwardFrom.displayName || msg.forwardFrom.username || t("chat.user")}
                              </span>
                            </div>
                          )}
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={cn(
                              'mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px] max-w-[200px]',
                              isOwn
                                ? 'border-background/40 bg-background/10 text-background/70'
                                : 'border-[--accent-brand] bg-[--accent-brand-muted] text-muted-foreground',
                            )}>
                              <p className="font-semibold text-[--accent-brand] truncate">
                                {msg.replyTo.sender?.displayName || msg.replyTo.sender?.username || t('channel.user')}
                              </p>
                              <p className="line-clamp-1 opacity-80">
                                {(decrypted.get(msg.replyTo.id) ?? (isEncrypted(msg.replyTo.iv) ? '🔒' : msg.replyTo.ciphertext))?.slice(0, 80)}
                              </p>
                            </div>
                          )}
                          {singleEmoji ? (
                            <span className="text-5xl leading-none">{displayText!.trim()}</span>
                          ) : isVoice ? (
                            <VoicePlayer
                              src={(msg as any).voiceUrl}
                              duration={(msg as any).voiceDuration ?? 0}
                              isOwn={isOwn}
                            />
                          ) : isMedia ? (
                            <div className="space-y-1.5">
                              <MediaAttachment
                                url={(msg as any).mediaUrl}
                                type={(msg as any).mediaType ?? 'file'}
                                name={(msg as any).mediaName}
                                size={(msg as any).mediaSize}
                                isOwn={isOwn}
                              />
                              {displayText && displayText !== `[${(msg as any).mediaType}]` && (
                                <MarkdownText text={displayText} className="break-words leading-relaxed" isOwn={isOwn} />
                              )}
                            </div>
                          ) : (msg as any).callType ? (
                            <CallLogBubble
                              callType={(msg as any).callType}
                              callDuration={(msg as any).callDuration ?? null}
                              isOwn={isOwn}
                              time={formatTime(msg.createdAt)}
                            />
                          ) : displayText === null ? (
                            <span className="inline-block h-3 w-24 animate-pulse rounded bg-current opacity-20" />
                          ) : (
                            <MarkdownText text={displayText} className="break-words leading-relaxed" isOwn={isOwn} />
                          )}
                          {!singleEmoji && (
                            <div className={['mt-0.5 flex items-center gap-1 text-[10px]', isOwn ? 'justify-end text-background/60' : 'text-muted-foreground'].join(' ')}>
                              <span>{formatTime(msg.createdAt)}</span>
                              {msg.editedAt && <span>· изм.</span>}
                              {isOwn && (
                                msg.readAt
                                  ? <CheckCheck className="size-3 text-background/70" strokeWidth={2.5} />
                                  : <Check className="size-3 text-background/40" strokeWidth={2.5} />
                              )}
                            </div>
                          )}
                          {singleEmoji && (
                            <div className={['mt-0.5 flex items-center gap-1 text-[10px]', isOwn ? 'justify-end' : ''].join(' ')}>
                              <span className="text-muted-foreground">{formatTime(msg.createdAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {pressedId === msg.id && !isEditing && (
                        <>
                          <div className="fixed inset-0 z-[400]" onClick={() => setPressedId(null)} />
                          <div
                            className="fixed z-[401] w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                            style={{ left: menuPos.x, top: menuPos.y }}
                          >
                            {/* Быстрые эмодзи */}
                            <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
                              {EMOJI_QUICK.map(e => (
                                <button key={e} type="button" onClick={() => toggleReaction(msg.id, e)}
                                  className={cn('flex size-8 items-center justify-center rounded-xl text-lg transition-all hover:scale-110 active:scale-95',
                                    reactions.get(msg.id)?.find(r => r.emoji === e)?.mine && 'bg-[--accent-brand-muted]'
                                  )}>{e}</button>
                              ))}
                            </div>
                            {/* Действия */}
                            <div className="p-1">
                              <button type="button" onClick={() => { setReplyTo(msg); setPressedId(null); inputRef.current?.focus() }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <Reply className="size-4 text-muted-foreground" strokeWidth={1.5} />Ответить
                              </button>
                              <button type="button" onClick={() => { openThread(msg.id); setPressedId(null) }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <MessageSquare className="size-4 text-muted-foreground" strokeWidth={1.5} />Тред
                              </button>
                              <button type="button" onClick={() => copyMessage(msg.id)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <Copy className="size-4 text-muted-foreground" strokeWidth={1.5} />Копировать
                              </button>
                              <button type="button" onClick={() => {
                                setForwardMsg(msg); setPressedId(null)
                                apiFetch('/api/conversations').then(r => r.json()).then(d => {
                                  setForwardConvs((d.data ?? []).map((c: { user: { id: string; displayName?: string; username?: string; numericId?: number; avatarUrl?: string | null } }) => ({
                                    id: c.user.id,
                                    name: c.user.displayName || c.user.username || `User ${c.user.numericId}`,
                                    avatarUrl: c.user.avatarUrl,
                                  })))
                                  setShowForwardModal(true)
                                }).catch(() => null)
                              }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <Forward className="size-4 text-muted-foreground" strokeWidth={1.5} />Переслать
                              </button>
                              <button type="button" onClick={() => { setPinMsgId(msg.id); setPressedId(null) }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <Pin className="size-4 text-muted-foreground" strokeWidth={1.5} />Закрепить
                              </button>
                              <button type="button" onClick={() => { setSelectMode(true); toggleSelect(msg.id); setPressedId(null) }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                <CheckSquare className="size-4 text-muted-foreground" strokeWidth={1.5} />Выделить
                              </button>
                              {isOwn && (
                                <button type="button" onClick={() => { startEdit(msg); setPressedId(null) }}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                                  <Edit2 className="size-4 text-muted-foreground" strokeWidth={1.5} />Редактировать
                                </button>
                              )}
                              <div className="h-px bg-border mx-2 my-0.5" />
                              <button type="button" onClick={() => { setDeleteMsgId(msg.id); setDeleteMsgIsOwn(isOwn); setPressedId(null) }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                                <Trash2 className="size-4" strokeWidth={1.5} />Удалить
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Reactions display */}
                      {(reactions.get(msg.id) ?? []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(reactions.get(msg.id) ?? []).map(r => (
                            <button key={r.emoji} type="button" onClick={() => toggleReaction(msg.id, r.emoji)}
                              title={r.users.join(', ')}
                              className={cn(
                                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all hover:scale-105',
                                r.mine ? 'border-[--accent-brand] bg-[--accent-brand-muted] text-[--accent-brand]' : 'border-border bg-card text-foreground',
                              )}>
                              <span>{r.emoji}</span>
                              <span className="font-medium">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Быстрый ответ при hover (десктоп) */}
                    {!selectMode && !isCallMsg && !(msg as any).voiceUrl && (
                      <button
                        type="button"
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                        className={cn(
                          'mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground opacity-0 transition-all group-hover/msg:opacity-100 hover:bg-muted hover:text-foreground active:scale-95',
                          isOwn ? 'order-first' : 'order-last',
                        )}
                        title="Ответить (R)"
                      >
                        <Reply className="size-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* Typing */}
        {typingUsers && typingUsers.size > 0 && (
          <div className="flex items-end gap-1.5 mt-2">
            <div className="size-6 shrink-0" />
            <div className="rounded-[20px] rounded-bl-[6px] bg-muted px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — iOS style */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        {/* Панель записи голосового — показывается над полем ввода */}
        {selectedUser && voiceRecorder.state !== 'idle' && (
          <VoiceRecordingBar
            recorder={voiceRecorder}
            onSend={async (blob, dur) => {
              const fd = new FormData()
              fd.append('audio', blob, 'voice.webm')
              fd.append('receiverId', selectedUser.id)
              fd.append('duration', String(dur))
              await apiFetch('/api/voice', { method: 'POST', body: fd })
            }}
          />
        )}
        {/* Попап упоминаний @ */}
        {mentionQuery !== null && mentionResults.length > 0 && (
          <div className="border-t border-border bg-background">
            {mentionResults.map(u => (
              <button key={u.id} type="button"
                onClick={() => {
                  const cursor = inputRef.current?.selectionStart ?? text.length
                  const before = text.slice(0, cursor)
                  const after = text.slice(cursor)
                  const replaced = before.replace(/@[\w]*$/, `@${u.username || u.displayName} `)
                  setText(replaced + after)
                  setMentionQuery(null)
                  setTimeout(() => inputRef.current?.focus(), 0)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="size-7 shrink-0 overflow-hidden rounded-full bg-muted">
                  {u.avatarUrl
                    ? <Image src={u.avatarUrl} alt="" width={28} height={28} className="size-full object-cover" />
                    : <div className="flex size-full items-center justify-center text-[10px] font-bold text-muted-foreground">{(u.displayName || u.username || '?').charAt(0).toUpperCase()}</div>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.displayName || u.username}</p>
                  {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Reply className="size-3.5 shrink-0 text-[--accent-brand]" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[--accent-brand]">
                {replyTo.sender.displayName || replyTo.sender.username || t("chat.user")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {decrypted.get(replyTo.id) ?? replyTo.ciphertext}
              </p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)}>
              <X className="size-3.5 text-muted-foreground" strokeWidth={2} />
            </button>
          </div>
        )}
        {/* Forward modal */}
        <ForwardModal
          open={showForwardModal}
          conversations={forwardConvs}
          onClose={() => { setShowForwardModal(false); setForwardMsg(null) }}
          onSelect={async (conv) => {
            if (!forwardMsg) return
            setShowForwardModal(false)
            const fwdFrom = {
              userId: forwardMsg.sender.id,
              displayName: forwardMsg.sender.displayName ?? null,
              username: forwardMsg.sender.username ?? null,
            }
            const plainText = decrypted.get(forwardMsg.id) ?? forwardMsg.ciphertext
            let ciphertext = plainText
            let iv = 'plain-fwd-' + Date.now()
            try {
              const keyRes = await apiFetch(`/api/users/${conv.id}/key`)
              const keyData = await keyRes.json()
              if (keyData.data?.publicKey) {
                const pk = await loadPrivateKey(currentUserId)
                if (pk) {
                  const enc = await encryptMessage(plainText, pk, keyData.data.publicKey)
                  ciphertext = enc.ciphertext; iv = enc.iv
                }
              }
            } catch {}
            await apiFetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ receiverId: conv.id, ciphertext, iv, forwardFrom: fwdFrom }),
            })
            setForwardMsg(null)
            router.push(`/messages?with=${conv.id}`)
          }}
        />

        {/* Поле ввода — скрываем когда запись активна */}
        {voiceRecorder.state === 'idle' && (
          <div className="flex flex-col">
            {/* Превью медиа */}
            {pendingMedia && (
              <MediaUploadButton
                onUpload={setPendingMedia}
                onClear={() => setPendingMedia(null)}
                current={pendingMedia}
                disabled={sending}
              />
            )}
          <div className="flex items-end gap-2 px-3 py-2">
            <div className="flex flex-1 items-end rounded-full border border-border bg-muted/50 px-4 py-2 gap-2">
              <textarea
                ref={inputRef}
                value={editingId ? editText : text}
                onChange={e => {
                  if (editingId) { setEditText(e.target.value) }
                  else {
                    const val = e.target.value
                    setText(val)
                    autoResize(e.target)
                    onTyping?.(true)
                    if (typingTimer.current) clearTimeout(typingTimer.current)
                    typingTimer.current = setTimeout(() => onTyping?.(false), 2000)
                    // Детекция @упоминаний
                    const cursor = e.target.selectionStart ?? val.length
                    const before = val.slice(0, cursor)
                    const match = before.match(/@([\w]*)$/)
                    if (match) setMentionQuery(match[1])
                    else setMentionQuery(null)
                  }
                }}
                onKeyDown={e => {
                  // Навигация по списку упоминаний
                  if (mentionQuery !== null && mentionResults.length > 0) {
                    if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingId ? handleEdit() : handleSend() }
                  if (e.key === 'Escape' && editingId) { setEditingId(null); setEditText('') }
                  // R — быстрый ответ на последнее сообщение (TG-стиль, только если поле пустое)
                  if (e.key === 'r' && !text.trim() && !editingId && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const last = messages[messages.length - 1]
                    if (last && last.senderId !== currentUserId) {
                      e.preventDefault()
                      setReplyTo(last)
                    }
                  }
                }}
                placeholder={t('chat.typeMessage')}
                disabled={sending}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                style={{ maxHeight: '120px' }}
              />
              <EmojiPicker
                onSelect={emoji => {
                  if (editingId) { setEditText(prev => prev + emoji) }
                  else { setText(prev => prev + emoji) }
                  inputRef.current?.focus()
                }}
              />
            </div>

            {/* Send если есть текст, Mic если пустое поле */}
            {(editingId ? editText.trim() : text.trim()) ? (
              <button type="button"
                onClick={editingId ? handleEdit : handleSend}
                disabled={sending}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-30"
              >
                {sending
                  ? <div className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  : <Send className="size-4 -translate-x-px" strokeWidth={2.5} />
                }
              </button>
            ) : !editingId && selectedUser ? (
              <div className="flex items-center gap-1">
                <MediaUploadButton
                  onUpload={setPendingMedia}
                  onClear={() => setPendingMedia(null)}
                  current={null}
                  disabled={sending}
                />
                <VoiceMicButton
                  recorder={voiceRecorder}
                  onSend={async (blob, dur) => {
                    const fd = new FormData()
                    fd.append('audio', blob, 'voice.webm')
                    fd.append('receiverId', selectedUser.id)
                    fd.append('duration', String(dur))
                    await apiFetch('/api/voice', { method: 'POST', body: fd })
                  }}
                  disabled={sending}
                />
              </div>
            ) : null}
          </div>
          </div>
        )}
      </div>

      {/* Delete chat modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">{t("notif.title")}</p>
              <p className="text-xs text-muted-foreground mt-1">$1{t("$2")}$3</p>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={() => deleteChat('clear')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Eraser className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">$1{t("$2")}$3</p>
                  <p className="text-xs text-muted-foreground">$1{t("$2")}$3</p>
                </div>
              </button>
              <button type="button" onClick={() => deleteChat('delete')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">$1{t("$2")}$3</p>
                  <p className="text-xs text-destructive/70">$1{t("$2")}$3</p>
                </div>
              </button>
              <button type="button" onClick={() => setShowDeleteModal(false)}
                className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium border border-border hover:bg-muted/40 transition-colors mt-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete message modal */}
      {deleteMsgId && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" onClick={() => setDeleteMsgId(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">{t("notif.title")}</p>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={async () => {
                if (deleteMsgId === '__selected__') await deleteSelected('self')
                else await onDeleteMessage(deleteMsgId, 'self')
                setDeleteMsgId(null)
              }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Eraser className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">$1{t("$2")}$3</p>
                  <p className="text-xs text-muted-foreground">$1{t("$2")}$3</p>
                </div>
              </button>
              {(deleteMsgIsOwn || deleteMsgId === '__selected__') && (
                <button type="button" onClick={async () => {
                  if (deleteMsgId === '__selected__') await deleteSelected('all')
                  else await onDeleteMessage(deleteMsgId, 'all')
                  setDeleteMsgId(null)
                }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-destructive/10 transition-colors text-left text-destructive">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium">$1{t("$2")}$3</p>
                    <p className="text-xs text-destructive/70">Исчезнет для всех</p>
                  </div>
                </button>
              )}
              <button type="button" onClick={() => setDeleteMsgId(null)}
                className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium border border-border hover:bg-muted/40 transition-colors mt-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin message modal */}
      {pinMsgId && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4" onClick={() => setPinMsgId(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">{t("notif.title")}</p>
            </div>
            <div className="p-3 space-y-1">
              <button type="button" onClick={() => pinMessage(pinMsgId, 'self')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted/50 transition-colors text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Pin className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">$1{t("$2")}$3</p>
                  <p className="text-xs text-muted-foreground">$1{t("$2")}$3</p>
                </div>
              </button>
              <button type="button" onClick={() => pinMessage(pinMsgId, 'all')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[--accent-brand-muted] transition-colors text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[--accent-brand-muted]">
                  <Pin className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium">$1{t("$2")}$3</p>
                  <p className="text-xs text-muted-foreground">$1{t("$2")}$3</p>
                </div>
              </button>
              <button type="button" onClick={() => setPinMsgId(null)}
                className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium border border-border hover:bg-muted/40 transition-colors mt-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationsModal
        open={showNotifModal}
        muted={muted}
        onClose={() => setShowNotifModal(false)}
        onMute={() => { setMuted(true); setShowNotifModal(false) }}
        onUnmute={() => { setMuted(false); setShowNotifModal(false) }}
      />

      {/* Thread panel */}
      {threadMsgId && (
        <div className="fixed inset-0 z-[150] flex justify-end" onClick={() => setThreadMsgId(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
                <p className="text-sm font-semibold">Тред</p>
                {!threadLoading && <span className="text-xs text-muted-foreground">{threadReplies.length} ответов</span>}
              </div>
              <button type="button" onClick={() => setThreadMsgId(null)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {threadLoading ? (
                <div className="flex justify-center py-8">
                  <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
                </div>
              ) : threadReplies.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <MessageSquare className="size-8 text-muted-foreground" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">Нет ответов</p>
                  <p className="text-xs text-muted-foreground">Ответьте на сообщение, чтобы начать тред</p>
                </div>
              ) : threadReplies.map((reply: any) => {
                const isOwn = reply.senderId === currentUserId
                const name = reply.sender?.displayName || reply.sender?.username || `User ${reply.sender?.numericId ?? ''}`
                const text = decrypted.get(reply.id) ?? (isEncrypted(reply.iv) ? '🔒' : reply.ciphertext)
                return (
                  <div key={reply.id} className={cn('flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                    {!isOwn && (
                      <div className="size-6 shrink-0 overflow-hidden rounded-full bg-muted">
                        {reply.sender.avatarUrl
                          ? <Image src={reply.sender.avatarUrl} alt={name} width={24} height={24} className="size-full object-cover" />
                          : <div className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">{(name || '?').charAt(0).toUpperCase()}</div>
                        }
                      </div>
                    )}
                    <div className={cn('max-w-[80%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                      {!isOwn && <p className="mb-0.5 px-1 text-[10px] font-medium text-muted-foreground">{name}</p>}
                      <div className={cn(
                        'rounded-[18px] px-3 py-2 text-sm',
                        isOwn
                          ? 'msg-own rounded-br-[6px]'
                          : 'bg-muted text-foreground rounded-bl-[6px] dark:bg-[oklch(0.26_0_0)]',
                      )}>
                        <p className="break-words leading-relaxed">{text}</p>
                        <p className={cn('mt-0.5 text-[10px]', isOwn ? 'text-background/60 text-right' : 'text-muted-foreground')}>
                          {new Date(reply.createdAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Reply in thread */}
            <div className="border-t border-border px-3 py-2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2">
                <textarea
                  placeholder="Ответить в треде..."
                  rows={1}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const val = (e.target as HTMLTextAreaElement).value.trim()
                      if (!val) return
                      ;(e.target as HTMLTextAreaElement).value = ''
                      await onSendMessage('plain-' + val, 'plain-' + Date.now(), threadMsgId, null, val)
                      // Обновляем тред
                      openThread(threadMsgId!)
                    }
                  }}
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: '80px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения звонка */}
      {callConfirm && selectedUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setCallConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 px-6 py-8">
              <div className="size-20 overflow-hidden rounded-full bg-muted ring-4 ring-[--accent-brand]/20">
                {callPeerAvatar
                  ? <Image src={callPeerAvatar} alt={callPeerName} width={80} height={80} className="size-full object-cover" />
                  : <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground">{(callPeerName || '?').charAt(0).toUpperCase()}</div>
                }
              </div>
              <div className="text-center">
                <p className="font-[family-name:var(--font-syne)] text-lg font-black tracking-tight">{callPeerName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {callConfirm.video ? 'Начать видеозвонок?' : 'Начать аудиозвонок?'}
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button type="button" onClick={() => setCallConfirm(null)}
                  className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold transition-all hover:bg-muted/40 active:scale-95">
                  Отмена
                </button>
                <button type="button" onClick={() => {
                  setCallConfirm(null)
                  startCall(selectedUser.id, callConfirm.video)
                }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95">
                  {callConfirm.video ? <Video className="size-4" strokeWidth={2} /> : <Phone className="size-4" strokeWidth={2} />}
                  Позвонить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
