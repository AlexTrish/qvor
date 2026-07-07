// lib/crypto/e2e.ts
// Все крипто-операции изолированы здесь. Никогда не логировать plaintext/sharedSecret/privateKey.

import { x25519 } from '@noble/curves/ed25519'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Key generation ───────────────────────────────────────────────────────────

export type KeyPair = { privateKey: string; publicKey: string } // hex strings

export function generateKeyPair(): KeyPair {
  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey: bytesToHex(privateKey), publicKey: bytesToHex(publicKey) }
}

// ─── ECDH shared secret ───────────────────────────────────────────────────────

function getSharedSecret(privateKeyHex: string, publicKeyHex: string): Uint8Array {
  return x25519.getSharedSecret(hexToBytes(privateKeyHex), hexToBytes(publicKeyHex))
}

async function sharedSecretToAesKey(secret: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', secret.buffer as ArrayBuffer)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

// ─── AES-256-GCM encrypt/decrypt ─────────────────────────────────────────────

export async function encryptMessage(
  plaintext: string,
  myPrivateKeyHex: string,
  theirPublicKeyHex: string,
): Promise<{ ciphertext: string; iv: string }> {
  const secret = getSharedSecret(myPrivateKeyHex, theirPublicKeyHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, aesKey, encoded)
  return {
    ciphertext: bytesToB64(new Uint8Array(encrypted)),
    iv: bytesToB64(iv),
  }
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  myPrivateKeyHex: string,
  theirPublicKeyHex: string,
): Promise<string> {
  const secret = getSharedSecret(myPrivateKeyHex, theirPublicKeyHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(iv).buffer as ArrayBuffer },
    aesKey,
    b64ToBytes(ciphertext).buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(decrypted)
}

// ─── Blob: AES-GCM(PBKDF2(password), privateKey) ─────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBlob(privateKeyHex: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(privateKeyHex),
  )
  // Формат: salt(16) + iv(12) + ciphertext → base64
  const combined = new Uint8Array(16 + 12 + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, 16)
  combined.set(new Uint8Array(encrypted), 28)
  return bytesToB64(combined)
}

export async function decryptBlob(blob: string, password: string): Promise<string> {
  const combined = b64ToBytes(blob)
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, ciphertext.buffer as ArrayBuffer)
  return new TextDecoder().decode(decrypted)
}

// ─── IndexedDB storage for privateKey ────────────────────────────────────────

const DB_NAME = 'qvor-keys'
const STORE = 'keys'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storePrivateKey(userId: string, privateKeyHex: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(privateKeyHex, `pk:${userId}`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPrivateKey(userId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(`pk:${userId}`)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearPrivateKey(userId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(`pk:${userId}`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── Channel key (E2E для групп) ────────────────────────────────────────────────────────────────────────────────────

// Генерируем случайный AES-256 ключ канала
export function generateChannelKey(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

// Шифруем channelKey публичным ключом участника (через ECDH с эфемерным ключом)
export async function encryptChannelKey(
  channelKeyHex: string,
  recipientPublicKeyHex: string,
): Promise<string> {
  // Генерируем эфемерную пару для этой операции
  const ephemeralPrivate = bytesToHex(x25519.utils.randomPrivateKey())
  const ephemeralPublic = bytesToHex(x25519.getPublicKey(hexToBytes(ephemeralPrivate)))
  const secret = getSharedSecret(ephemeralPrivate, recipientPublicKeyHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    aesKey,
    new TextEncoder().encode(channelKeyHex),
  )
  // Формат: ephemeralPublic(32 bytes hex=64 chars) + ':' + iv(b64) + ':' + ciphertext(b64)
  return `${ephemeralPublic}:${bytesToB64(iv)}:${bytesToB64(new Uint8Array(encrypted))}`
}

// Расшифруем channelKey своим приватным ключом
export async function decryptChannelKey(
  encryptedChannelKey: string,
  myPrivateKeyHex: string,
): Promise<string> {
  const [ephemeralPublicHex, ivB64, ciphertextB64] = encryptedChannelKey.split(':')
  const secret = getSharedSecret(myPrivateKeyHex, ephemeralPublicHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivB64).buffer as ArrayBuffer },
    aesKey,
    b64ToBytes(ciphertextB64).buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(decrypted)
}

// Шифруем сообщение канала через channelKey
export async function encryptChannelMessage(
  plaintext: string,
  channelKeyHex: string,
): Promise<{ ciphertext: string; iv: string }> {
  const keyBytes = hexToBytes(channelKeyHex)
  const aesKey = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    aesKey,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: bytesToB64(new Uint8Array(encrypted)), iv: `ch:${bytesToB64(iv)}` }
}

// Расшифруем сообщение канала
export async function decryptChannelMessage(
  ciphertext: string,
  iv: string,
  channelKeyHex: string,
): Promise<string> {
  const keyBytes = hexToBytes(channelKeyHex)
  const aesKey = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
  const ivBytes = b64ToBytes(iv.startsWith('ch:') ? iv.slice(3) : iv)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
    aesKey,
    b64ToBytes(ciphertext).buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(decrypted)
}

// IndexedDB: храним channelKey по channelId
export async function storeChannelKey(channelId: string, channelKeyHex: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(channelKeyHex, `ck:${channelId}`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadChannelKey(channelId: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(`ck:${channelId}`)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

// ─── Мультидевайс: передача privateKey через ephemeral ключ ──────────────────

// Шифруем privateKey ephemeral публичным ключом нового устройства
export async function encryptPrivateKeyForDevice(
  privateKeyHex: string,
  deviceEphemeralPublicKeyHex: string,
): Promise<string> {
  // Генерируем свой ephemeral ключ для этой операции
  const myEphemeralPrivate = bytesToHex(x25519.utils.randomPrivateKey())
  const myEphemeralPublic = bytesToHex(x25519.getPublicKey(hexToBytes(myEphemeralPrivate)))
  const secret = getSharedSecret(myEphemeralPrivate, deviceEphemeralPublicKeyHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    aesKey,
    new TextEncoder().encode(privateKeyHex),
  )
  // Формат: myEphemeralPublic:iv(b64):ciphertext(b64)
  return `${myEphemeralPublic}:${bytesToB64(iv)}:${bytesToB64(new Uint8Array(encrypted))}`
}

// Расшифровываем privateKey своим ephemeral приватным ключом
export async function decryptPrivateKeyFromDevice(
  encryptedData: string,
  myEphemeralPrivateKeyHex: string,
): Promise<string> {
  const [senderEphemeralPublicHex, ivB64, ciphertextB64] = encryptedData.split(':')
  const secret = getSharedSecret(myEphemeralPrivateKeyHex, senderEphemeralPublicHex)
  const aesKey = await sharedSecretToAesKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivB64).buffer as ArrayBuffer },
    aesKey,
    b64ToBytes(ciphertextB64).buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(decrypted)
}
