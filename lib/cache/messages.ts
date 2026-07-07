/**
 * In-memory message cache с TTL и LRU-подобным вытеснением.
 * Хранится в globalThis для выживания hot-reload в dev.
 * Key: sorted `${userA}:${userB}`
 */

const TTL_MS = 24 * 60 * 60 * 1000  // 24 часа
const MAX_ENTRIES = 500               // максимум диалогов в кэше
const MAX_MSGS_PER_CONV = 100         // максимум сообщений на диалог

type CachedMsg = {
  id: string
  senderId: string
  receiverId: string
  ciphertext: string
  iv: string
  createdAt: string
  editedAt?: string | null
  sender: { id: string; numericId: number; username?: string; displayName?: string; avatarUrl?: string }
  receiver: { id: string; numericId: number; username?: string; displayName?: string; avatarUrl?: string }
}

type CacheEntry = { messages: CachedMsg[]; cachedAt: number; accessedAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __msgCache: Map<string, CacheEntry> | undefined
}

function store(): Map<string, CacheEntry> {
  if (!global.__msgCache) global.__msgCache = new Map()
  return global.__msgCache
}

function key(a: string, b: string) {
  return [a, b].sort().join(':')
}

export function getCachedMessages(userId: string, peerId: string): CachedMsg[] | null {
  const k = key(userId, peerId)
  const entry = store().get(k)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) { store().delete(k); return null }
  entry.accessedAt = Date.now()
  return entry.messages
}

export function setCachedMessages(userId: string, peerId: string, messages: CachedMsg[]): void {
  const k = key(userId, peerId)
  const trimmed = messages.slice(-MAX_MSGS_PER_CONV)
  store().set(k, { messages: trimmed, cachedAt: Date.now(), accessedAt: Date.now() })
  evict()
}

export function upsertCachedMessage(userId: string, peerId: string, msg: CachedMsg): void {
  const entry = store().get(key(userId, peerId))
  if (!entry) return
  const idx = entry.messages.findIndex(m => m.id === msg.id)
  if (idx >= 0) entry.messages[idx] = msg
  else {
    entry.messages.push(msg)
    if (entry.messages.length > MAX_MSGS_PER_CONV) {
      entry.messages = entry.messages.slice(-MAX_MSGS_PER_CONV)
    }
  }
  entry.accessedAt = Date.now()
}

export function removeCachedMessage(userId: string, peerId: string, msgId: string): void {
  const entry = store().get(key(userId, peerId))
  if (!entry) return
  entry.messages = entry.messages.filter(m => m.id !== msgId)
}

export function invalidateCache(userId: string, peerId: string): void {
  store().delete(key(userId, peerId))
}

function evict(): void {
  const s = store()
  const now = Date.now()

  // Удаляем просроченные
  for (const [k, e] of s) {
    if (now - e.cachedAt > TTL_MS) s.delete(k)
  }

  // Если всё ещё превышаем лимит — удаляем LRU (наименее недавно использованные)
  if (s.size > MAX_ENTRIES) {
    const sorted = [...s.entries()].sort((a, b) => a[1].accessedAt - b[1].accessedAt)
    const toDelete = sorted.slice(0, s.size - MAX_ENTRIES)
    for (const [k] of toDelete) s.delete(k)
  }
}
