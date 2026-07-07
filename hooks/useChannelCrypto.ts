'use client'

import { useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'

// Кэш расшифрованных channelKey в памяти (не в IndexedDB — они там уже хранятся)
const channelKeyCache = new Map<string, string>()

export function useChannelCrypto() {
  const { user } = useAuth()
  const loadingRef = useRef(new Set<string>())

  // Получить расшифрованный channelKey для канала
  const getChannelKey = useCallback(async (channelId: string): Promise<string | null> => {
    if (!user?.id) return null

    // Из кэша
    const cached = channelKeyCache.get(channelId)
    if (cached) return cached

    // Предотвращаем параллельные запросы
    if (loadingRef.current.has(channelId)) return null
    loadingRef.current.add(channelId)

    try {
      // Сначала пробуем IndexedDB
      const { loadChannelKey } = await import('@/lib/crypto/e2e')
      const stored = await loadChannelKey(channelId)
      if (stored) {
        channelKeyCache.set(channelId, stored)
        return stored
      }

      // Загружаем зашифрованный ключ с сервера
      const res = await fetch(`/api/channels/${channelId}/key`, { credentials: 'include' })
      if (!res.ok) return null
      const json = await res.json()
      const encryptedKey = json.data?.encryptedChannelKey
      if (!encryptedKey) return null

      // Расшифровываем своим приватным ключом
      const { loadPrivateKey, decryptChannelKey, storeChannelKey } = await import('@/lib/crypto/e2e')
      const privateKey = await loadPrivateKey(user.id)
      if (!privateKey) return null

      const channelKey = await decryptChannelKey(encryptedKey, privateKey)
      await storeChannelKey(channelId, channelKey)
      channelKeyCache.set(channelId, channelKey)
      return channelKey
    } catch {
      return null
    } finally {
      loadingRef.current.delete(channelId)
    }
  }, [user?.id])

  // Зашифровать сообщение для канала
  const encryptForChannel = useCallback(async (
    plaintext: string,
    channelId: string,
  ): Promise<{ ciphertext: string; iv: string } | null> => {
    const channelKey = await getChannelKey(channelId)
    if (!channelKey) return null
    const { encryptChannelMessage } = await import('@/lib/crypto/e2e')
    return encryptChannelMessage(plaintext, channelKey)
  }, [getChannelKey])

  // Расшифровать сообщение канала
  const decryptFromChannel = useCallback(async (
    ciphertext: string,
    iv: string,
    channelId: string,
  ): Promise<string | null> => {
    if (!iv.startsWith('ch:')) return null // не зашифровано channelKey
    const channelKey = await getChannelKey(channelId)
    if (!channelKey) return null
    try {
      const { decryptChannelMessage } = await import('@/lib/crypto/e2e')
      return await decryptChannelMessage(ciphertext, iv, channelKey)
    } catch {
      return null
    }
  }, [getChannelKey])

  // Создать channelKey и зашифровать его публичным ключом создателя
  const createChannelKey = useCallback(async (): Promise<{
    channelKeyHex: string
    encryptedForMe: string
  } | null> => {
    if (!user?.id) return null
    try {
      const { generateChannelKey, encryptChannelKey } = await import('@/lib/crypto/e2e')
      // Получаем свой публичный ключ
      const res = await fetch(`/api/users/${user.id}/key`, { credentials: 'include' })
      const json = await res.json()
      const myPublicKey = json.data?.publicKey
      if (!myPublicKey) return null

      const channelKeyHex = generateChannelKey()
      const encryptedForMe = await encryptChannelKey(channelKeyHex, myPublicKey)
      return { channelKeyHex, encryptedForMe }
    } catch {
      return null
    }
  }, [user?.id])

  // Зашифровать channelKey для нового участника
  const encryptKeyForUser = useCallback(async (
    channelId: string,
    recipientPublicKey: string,
  ): Promise<string | null> => {
    const channelKey = await getChannelKey(channelId)
    if (!channelKey) return null
    try {
      const { encryptChannelKey } = await import('@/lib/crypto/e2e')
      return await encryptChannelKey(channelKey, recipientPublicKey)
    } catch {
      return null
    }
  }, [getChannelKey])

  return { getChannelKey, encryptForChannel, decryptFromChannel, createChannelKey, encryptKeyForUser }
}
