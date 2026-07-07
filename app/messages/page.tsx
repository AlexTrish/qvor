'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useMessages } from '@/hooks/useMessages'
import { useSearchParams } from 'next/navigation'
import { AppNav } from '@/components/AppNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConversationSkeleton, MessageSkeleton } from '@/components/Skeletons'
import { ChannelView } from '@/components/ChannelView'

const ConversationList = dynamic(
  () => import('@/components/ConversationList').then(m => ({ default: m.ConversationList })),
  { loading: () => <ConversationSkeleton />, ssr: false },
)

const ChatView = dynamic(
  () => import('@/components/ChatView').then(m => ({ default: m.ChatView })),
  { loading: () => <MessageSkeleton />, ssr: false },
)

export default function MessagesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const {
    conversations, messages, pinnedMessage, loading, typingUsers, newMsgIds,
    loadMessages, sendMessage, editMessage, deleteMessage, sendTyping, clearMessages, markAsRead,
  } = useMessages()

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const userCacheRef = useRef<Map<string, any>>(new Map())
  const autoOpenedRef = useRef(false)

  // Синхронизируем selectedUser с conversations в реальном времени (presence SSE)
  useEffect(() => {
    if (!selectedUserId || !selectedUser) return
    const conv = conversations.find(c => c.user.id === selectedUserId)
    if (!conv) return
    setSelectedUser((prev: any) => ({
      ...prev,
      isOnline: conv.user.isOnline,
      lastSeenAt: conv.user.lastSeenAt,
      avatarUrl: conv.user.avatarUrl ?? prev.avatarUrl,
      displayName: conv.user.displayName ?? prev.displayName,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedUserId])

  // Автооткрытие первого чата на десктопе
  useEffect(() => {
    if (autoOpenedRef.current) return
    if (!user || !conversations.length || selectedUserId) return
    if (typeof window !== 'undefined' && window.innerWidth < 768) return
    const chatId = searchParams.get('id')
    const isFavorites = searchParams.get('favorites') === '1'
    if (chatId || isFavorites) return // обработается ниже
    autoOpenedRef.current = true
    openChat(conversations[0].user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user?.id])

  useEffect(() => {
    if (!user) return
    const chatId = searchParams.get('id')
    const isFavorites = searchParams.get('favorites') === '1'
    const channelId = searchParams.get('channel')
    if (isFavorites) { autoOpenedRef.current = true; openChat(user.id) }
    else if (chatId) { autoOpenedRef.current = true; openChat(chatId) }
    else if (channelId) { autoOpenedRef.current = true; openChannel(channelId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user?.id])

  // Горячие клавиши
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedUserId) { handleBack(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-search]')?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  async function openChat(userId: string) {
    if (!user) return
    setSelectedUserId(userId)
    const param = userId === user.id ? '?favorites=1' : `?id=${userId}`
    window.history.replaceState(null, '', `/messages${param}`)

    if (userId === user.id) {
      setSelectedUser({
        id: user.id, numericId: user.numericId, username: user.username,
        displayName: 'Избранное', avatarUrl: null, isOnline: true, lastSeenAt: null,
      })
    } else {
      // Сначала берём из кэша или conversations — чат открывается мгновенно
      const cached = userCacheRef.current.get(userId)
      const fromConv = conversations.find(c => c.user.id === userId)
      if (cached) {
        setSelectedUser(cached)
      } else if (fromConv) {
        setSelectedUser(fromConv.user)
      }
      // Бот не есть в таблице users — не делаем fetch
      const isBotId = userId === '00000000-0000-0000-0000-000000000001'
      if (isBotId && !cached && !fromConv) {
        // Бот ещё не загрузился — ставим заголовок
        setSelectedUser({ id: userId, numericId: 100000, username: 'qvor', displayName: 'QVOR', avatarUrl: null, isOnline: true, lastSeenAt: null })
      } else if (!isBotId) {
        fetch(`/api/users/${userId}`)
          .then(r => r.json())
          .then(json => {
            if (json.data) {
              userCacheRef.current.set(userId, json.data)
              setSelectedUser(json.data)
            }
          })
          .catch(() => null)
      }
    }

    clearMessages()
    await Promise.all([
      loadMessages(userId),
      userId !== user.id ? markAsRead(userId) : Promise.resolve(),
    ])
  }

  function handleBack() {
    setSelectedUserId(null)
    setSelectedUser(null)
    setSelectedChannelId(null)
    clearMessages()
    window.history.replaceState(null, '', '/messages')
  }

  function openChannel(channelId: string) {
    setSelectedChannelId(channelId)
    setSelectedUserId(null)
    setSelectedUser(null)
    clearMessages()
    window.history.replaceState(null, '', `/messages?channel=${channelId}`)
  }

  if (!user) return null

  const chatProps = {
    messages,
    currentUserId: user.id,
    myAvatarUrl: user.avatarUrl ?? null,
    selectedUser,
    onBack: handleBack,
    onSendMessage: async (ct: string, iv: string, replyToId?: string | null, forwardFrom?: any, plaintext?: string, mentions?: string[] | null, media?: any) =>
      selectedUserId ? sendMessage(selectedUserId, ct, iv, replyToId, forwardFrom, plaintext, mentions, media) : null,
    onEditMessage: editMessage,
    onDeleteMessage: (id: string, mode?: 'self' | 'all') => deleteMessage(id, mode),
    onTyping: (isTyping: boolean) => { if (selectedUserId && selectedUserId !== user.id) sendTyping(selectedUserId, isTyping) },
    typingUsers,
    loading,
    pinnedMessage,
    newMsgIds,
  }

  const chatOpen = !!(selectedUserId || selectedChannelId)

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AppNav chatOpen={chatOpen} />

      <div className="flex flex-1 overflow-hidden md:gap-3 md:p-4">
        {/* Список диалогов */}
        <div className={[
          'flex flex-col overflow-hidden bg-background',
          'md:w-72 md:shrink-0 md:rounded-2xl md:border md:border-border md:shadow-sm',
          // Мобайл: скрываем если чат открыт, показываем всегда на десктопе
          chatOpen ? 'hidden md:flex w-full' : 'flex w-full mobile-pb',
        ].join(' ')}>
          <ErrorBoundary>
            <ConversationList
              conversations={conversations}
              selectedUserId={selectedUserId || undefined}
              selectedChannelId={selectedChannelId || undefined}
              onSelectConversation={openChat}
              onSelectChannel={openChannel}
              onNewChat={openChat}
              loading={loading}
              currentUserId={user.id}
              typingUsers={typingUsers}
            />
          </ErrorBoundary>
        </div>

        {/* Чат */}
        <div className={[
          'flex flex-col overflow-hidden bg-background',
          'md:flex-1 md:rounded-2xl md:border md:border-border md:shadow-sm',
          chatOpen ? 'flex flex-1' : 'hidden md:flex md:flex-1',
        ].join(' ')}>
          <ErrorBoundary>
            {selectedChannelId ? (
              <ChannelView
                currentUserId={user.id}
                initialChannelId={selectedChannelId}
                onClose={handleBack}
              />
            ) : (
              <ChatView {...chatProps} />
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
