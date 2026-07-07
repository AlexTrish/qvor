'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { apiFetch } from '@/lib/api'
import type { Conversation } from '@/hooks/useMessages'

type ChannelItem = {
  id: string; name: string; description?: string | null; avatarUrl?: string | null
  isPrivate: boolean; type: string; role: string | null; memberCount: number; lastMessageAt: string
}

type AppStoreCtx = {
  conversations: Conversation[]
  channels: ChannelItem[]
  conversationsLoaded: boolean
  channelsLoaded: boolean
  setConversations: Dispatch<SetStateAction<Conversation[]>>
  refreshConversations: () => Promise<void>
  refreshChannels: () => Promise<void>
  syncRefresh: (fn: () => void) => void
}

const Ctx = createContext<AppStoreCtx | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [channelsLoaded, setChannelsLoaded] = useState(false)
  const fetchingConv = useRef(false)
  const fetchingCh = useRef(false)
  const syncedRefresh = useRef<(() => void) | null>(null)

  const syncRefresh = useCallback((fn: () => void) => {
    syncedRefresh.current = fn
  }, [])

  const refreshConversations = useCallback(async () => {
    if (syncedRefresh.current) { syncedRefresh.current(); return }
    if (fetchingConv.current) return
    fetchingConv.current = true
    try {
      const res = await apiFetch('/api/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.data ?? [])
      setConversationsLoaded(true)
    } finally { fetchingConv.current = false }
  }, [])

  const refreshChannels = useCallback(async () => {
    if (fetchingCh.current) return
    fetchingCh.current = true
    try {
      const res = await apiFetch('/api/channels')
      if (!res.ok) return
      const data = await res.json()
      setChannels(data.data ?? [])
      setChannelsLoaded(true)
    } finally { fetchingCh.current = false }
  }, [])

  return (
    <Ctx.Provider value={{
      conversations, channels,
      conversationsLoaded, channelsLoaded,
      setConversations, refreshConversations, refreshChannels, syncRefresh,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
