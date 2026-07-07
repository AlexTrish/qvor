'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  generateKeyPair, encryptMessage, decryptMessage,
  encryptBlob, decryptBlob, storePrivateKey, loadPrivateKey, clearPrivateKey,
} from '@/lib/crypto/e2e'

type CryptoState = {
  ready: boolean
  publicKey: string | null
}

export function useCrypto(userId: string | undefined) {
  const [state, setState] = useState<CryptoState>({ ready: false, publicKey: null })

  // Загружаем publicKey из API при маунте
  useEffect(() => {
    if (!userId) return
    loadPrivateKey(userId).then(async (pk) => {
      if (!pk) { setState({ ready: false, publicKey: null }); return }
      // Восстанавливаем publicKey из privateKey
      const { x25519 } = await import('@noble/curves/ed25519')
      const pub = x25519.getPublicKey(Uint8Array.from(
        pk.match(/.{2}/g)!.map(h => parseInt(h, 16))
      ))
      const pubHex = [...pub].map(b => b.toString(16).padStart(2, '0')).join('')
      setState({ ready: true, publicKey: pubHex })
    })
  }, [userId])

  // Инициализация при регистрации: генерируем ключи, шифруем blob
  const initKeys = useCallback(async (password: string, passphrase: string) => {
    const { privateKey, publicKey } = generateKeyPair()
    const blob = await encryptBlob(privateKey, password)
    const blobRecovery = await encryptBlob(privateKey, passphrase)
    if (userId) await storePrivateKey(userId, privateKey)
    setState({ ready: true, publicKey })
    return { publicKey, blob, blobRecovery }
  }, [userId])

  // Разблокировка при входе: расшифровываем blob паролем
  const unlockWithPassword = useCallback(async (blob: string, password: string) => {
    const privateKey = await decryptBlob(blob, password)
    if (userId) await storePrivateKey(userId, privateKey)
    const { x25519 } = await import('@noble/curves/ed25519')
    const pub = x25519.getPublicKey(Uint8Array.from(
      privateKey.match(/.{2}/g)!.map(h => parseInt(h, 16))
    ))
    const pubHex = [...pub].map(b => b.toString(16).padStart(2, '0')).join('')
    setState({ ready: true, publicKey: pubHex })
  }, [userId])

  const encrypt = useCallback(async (plaintext: string, theirPublicKey: string): Promise<{ ciphertext: string; iv: string }> => {
    if (!userId) throw new Error('Not authenticated')
    const pk = await loadPrivateKey(userId)
    if (!pk) throw new Error('Private key not found')
    return encryptMessage(plaintext, pk, theirPublicKey)
  }, [userId])

  const decrypt = useCallback(async (ciphertext: string, iv: string, theirPublicKey: string): Promise<string> => {
    if (!userId) throw new Error('Not authenticated')
    const pk = await loadPrivateKey(userId)
    if (!pk) return ciphertext // fallback: показываем как есть
    try {
      return await decryptMessage(ciphertext, iv, pk, theirPublicKey)
    } catch {
      return ciphertext // если не удалось расшифровать
    }
  }, [userId])

  const clearKeys = useCallback(async () => {
    if (userId) await clearPrivateKey(userId)
    setState({ ready: false, publicKey: null })
  }, [userId])

  return { ...state, initKeys, unlockWithPassword, encrypt, decrypt, clearKeys }
}
