'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useSSE } from './useSSE'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/hooks/useAppStore'

export type Message = {
  id: string
  senderId: string
  receiverId: string
  ciphertext: string
  iv: string
  voiceUrl?: string | null
  voiceDuration?: number | null
  mediaUrl?: string | null
  mediaType?: string | null
  mediaName?: string | null
  mediaSize?: number | null
  replyToId?: string | null
  replyTo?: {
    id: string
    ciphertext: string
    iv: string
    senderId: string
    sender: { id: string; displayName?: string | null; username?: string | null }
  } | null
  forwardFrom?: {
    userId: string
    displayName: string | null
    username: string | null
  } | null
  createdAt: string
  editedAt?: string
  readAt?: string | null
  sender: { id: string; numericId: number; username?: string; displayName?: string; avatarUrl?: string }
  receiver: { id: string; numericId: number; username?: string; displayName?: string; avatarUrl?: string }
}

export type Conversation = {
  user: {
    id: string
    numericId: number
    username?: string
    displayName?: string
    avatarUrl?: string
    isOnline: boolean
    lastSeenAt?: string | null
  }
  lastMessageAt: string
  lastMessage?: string | null
  lastMessageSenderId?: string | null
  lastMessageSenderName?: string | null
  lastMessageReadAt?: string | null
  archived: boolean
  pinned: boolean
  pinnedAt?: string | null
  unreadCount: number
}

export function useMessages() {
  const { user } = useAuth()
  const store = useAppStore()
  // conversations живут в AppStore — между переходами не сбрасываются
  const conversations = store.conversations
  const setConversations = store.setConversations
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(!store.conversationsLoaded)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const activeConvRef = useRef<string | null>(null)

  const loadConversations = useCallback(async () => {
    if (!user) return
    try {
      const res = await apiFetch('/api/conversations')
      if (!res.ok) throw new Error('Failed to load conversations')
      const data = await res.json()
      setConversations(() => data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // store.conversationsLoaded намеренно убран из deps — не должен триггерить перезагрузку
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadMessages = useCallback(async (withUserId: string, cursor?: string) => {
    if (!user) return
    activeConvRef.current = withUserId
    // Сбрасываем unreadCount при открытии чата
    if (!cursor) {
      setConversations(prev => prev.map(c =>
        c.user.id === withUserId ? { ...c, unreadCount: 0 } : c
      ))
    }
    try {
      const params = new URLSearchParams({ with: withUserId })
      if (cursor) params.set('cursor', cursor)
      const res = await apiFetch(`/api/messages?${params}`)
      if (!res.ok) throw new Error('Failed to load messages')
      const data = await res.json()
      // API возвращает { messages, nextCursor } или { data, nextCursor }
      const msgs = data.messages ?? data.data ?? []
      setMessages(prev => cursor ? [...prev, ...msgs] : msgs)
      if (!cursor && data.pinnedMessage) setPinnedMessage(data.pinnedMessage)
      else if (!cursor) setPinnedMessage(null)
      return data.nextCursor
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [user?.id])

  const sendMessage = useCallback(async (
    receiverId: string,
    ciphertext: string,
    iv: string,
    replyToId?: string | null,
    forwardFrom?: { userId: string; displayName: string | null; username: string | null } | null,
    plaintext?: string,
    mentions?: string[] | null,
    media?: { mediaUrl: string; mediaType: string; mediaName: string; mediaSize: number } | null,
  ) => {
    if (!user) return null
    const optimistic: Message = {
      id: crypto.randomUUID(),
      senderId: user.id,
      receiverId,
      ciphertext,
      iv,
      replyToId,
      forwardFrom,
      ...(media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType, mediaName: media.mediaName, mediaSize: media.mediaSize } : {}),
      createdAt: new Date().toISOString(),
      sender: { id: user.id, numericId: user.numericId ?? 0 },
      receiver: { id: receiverId, numericId: 0 },
    }
    setMessages(prev => [...prev, optimistic])
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, ciphertext, iv, replyToId, forwardFrom, mentions, ...media }),
      })
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        throw new Error('Failed to send')
      }
      const data = await res.json()
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...optimistic, ...(data.message ?? data.data) } : m))
      const msg = data.message ?? data.data
      setConversations(prev => {
        const exists = prev.find(c => c.user.id === receiverId)
        if (exists) return prev.map(c => c.user.id === receiverId ? {
          ...c,
          lastMessageAt: msg?.createdAt ?? new Date().toISOString(),
          lastMessage: plaintext ?? ciphertext, // plaintext если есть, иначе ciphertext
          lastMessageSenderId: user.id,
          lastMessageReadAt: null,
        } : c)
        return prev
      })
      return msg
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [user?.id])

  const editMessage = useCallback(async (messageId: string, ciphertext: string, iv: string) => {
    try {
      const res = await apiFetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext, iv }),
      })
      if (!res.ok) throw new Error('Failed to edit')
      const data = await res.json()
      const msg = data.message ?? data.data
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...msg } : m))
      return msg
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [])

  const deleteMessage = useCallback(async (messageId: string, mode: 'self' | 'all' = 'all') => {
    try {
      const res = await apiFetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      setMessages(prev => prev.filter(m => m.id !== messageId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [])

  const sendTyping = useCallback(async (toUserId: string, isTyping: boolean) => {
    await apiFetch('/api/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, isTyping }),
    }).catch(() => null)
  }, [])

  const markAsRead = useCallback(async (fromUserId: string) => {
    await apiFetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId }),
    }).catch(() => null)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setPinnedMessage(null)
    activeConvRef.current = null
  }, [])

  // SSE handlers
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())

  useSSE({
    message: (data) => {
      const msg = data as Message
      const isActive = activeConvRef.current &&
        (msg.senderId === activeConvRef.current || msg.receiverId === activeConvRef.current)

      if (isActive) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        // Помечаем как новое для анимации, убираем через 500ms
        setNewMsgIds(prev => new Set([...prev, msg.id]))
        setTimeout(() => setNewMsgIds(prev => { const n = new Set(prev); n.delete(msg.id); return n }), 500)
      }

      // Обновляем диалог локально
      if (user) {
        const peerId = msg.senderId === user.id ? msg.receiverId : msg.senderId
        setConversations(prev => {
          const exists = prev.find(c => c.user.id === peerId)
          if (!exists) return prev
          return prev.map(c => {
            if (c.user.id !== peerId) return c
            // Инкрементируем unreadCount если чат не активен и сообщение от собеседника
            const newUnread = (!isActive && msg.senderId !== user.id)
              ? c.unreadCount + 1
              : c.unreadCount
            return {
              ...c,
              lastMessageAt: msg.createdAt,
              lastMessage: '🔒',
              lastMessageSenderId: msg.senderId,
              lastMessageReadAt: null,
              unreadCount: newUnread,
            }
          })
        })
      }
    },
    message_edit: (data) => {
      const { id, ciphertext, iv, editedAt } = data as { id: string; ciphertext: string; iv: string; editedAt: string }
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ciphertext, iv, editedAt } : m))
    },
    message_delete: (data) => {
      const { id } = data as { id: string }
      setMessages(prev => prev.filter(m => m.id !== id))
    },
    typing: (data) => {
      const { fromUserId, isTyping } = data as { fromUserId: string; toUserId: string; isTyping: boolean }
      if (fromUserId !== activeConvRef.current) return
      setTypingUsers(prev => {
        const next = new Set(prev)
        if (isTyping) next.add(fromUserId)
        else next.delete(fromUserId)
        return next
      })
      // Автоматически убираем через 3 сек
      const existing = typingTimers.current.get(fromUserId)
      if (existing) clearTimeout(existing)
      if (isTyping) {
        typingTimers.current.set(fromUserId, setTimeout(() => {
          setTypingUsers(prev => { const n = new Set(prev); n.delete(fromUserId); return n })
        }, 3000))
      }
    },
    read: (data) => {
      const { byUserId, readAt } = data as { byUserId: string; readAt: string }
      setMessages(prev => prev.map(m =>
        m.receiverId === byUserId && !m.readAt ? { ...m, readAt } : m
      ))
      // Обновляем lastMessageReadAt в диалоге
      setConversations(prev => prev.map(c =>
        c.user.id === byUserId ? { ...c, lastMessageReadAt: readAt } : c
      ))
    },
    presence: (data) => {
      const { userId, isOnline, lastSeenAt } = data as { userId: string; isOnline: boolean; lastSeenAt: string }
      setConversations(prev => prev.map(c =>
        c.user.id === userId ? { ...c, user: { ...c.user, isOnline, lastSeenAt } } : c
      ))
    },
    conv_new: (data) => {
      const conv = data as Conversation
      // Бот уже есть в списке как botConv — не дублируем
      if (conv.user.id === '00000000-0000-0000-0000-000000000001') return
      setConversations(prev => {
        if (prev.find(c => c.user.id === conv.user.id)) return prev
        return [prev[0], conv, ...prev.slice(1)] // keep Favorites first
      })
    },
    user_update: (data) => {
      const { id, avatarUrl, displayName } = data as { id: string; avatarUrl?: string | null; displayName?: string | null }
      setConversations(prev => prev.map(c =>
        c.user.id === id
          ? { ...c, user: { ...c.user, ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? undefined } : {}), ...(displayName !== undefined ? { displayName: displayName ?? undefined } : {}) } }
          : c
      ))
    },
  })

  useEffect(() => {
    if (!user?.id) return
    // Регистрируем в сторе один раз при монтировании
    store.syncRefresh(loadConversations)
    // Загружаем только если данных ещё нет
    if (!store.conversationsLoaded) loadConversations()
    window.addEventListener('reload-conversations', loadConversations)
    return () => window.removeEventListener('reload-conversations', loadConversations)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return {
    conversations, messages, pinnedMessage, loading, error, typingUsers, newMsgIds,
    loadConversations, loadMessages, sendMessage, editMessage,
    deleteMessage, sendTyping, clearMessages, markAsRead,
  }
}
