import { readFileSync } from 'fs'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { jwtVerify } from 'jose'

// ─── Load .env.local ──────────────────────────────────────────────────────────
try {
  const content = readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {}

const PORT = parseInt(process.env.WS_PORT ?? '3001', 10)
const JWT_SECRET = process.env.JWT_SECRET!
if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1) }

const secret = new TextEncoder().encode(JWT_SECRET)

// userId → WebSocket
const clients = new Map<string, WebSocket>()

const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
  // Аутентификация через токен в query string: ws://host:3001?token=ACCESS_TOKEN
  const url = new URL(req.url ?? '/', `http://localhost`)
  const token = url.searchParams.get('token')

  if (!token) { ws.close(4001, 'Unauthorized'); return }

  let userId: string
  try {
    const { payload } = await jwtVerify(token, secret)
    userId = payload.sub as string
    if (!userId) throw new Error('no sub')
  } catch {
    ws.close(4001, 'Invalid token')
    return
  }

  // Регистрируем клиента
  clients.set(userId, ws)
  console.log(`[WS] connected: ${userId} (total: ${clients.size})`)

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {
        type: 'offer' | 'answer' | 'ice' | 'end' | 'reject'
        to: string
        callId: string
        [key: string]: unknown
      }

      if (!msg.type || !msg.to || !msg.callId) return

      const target = clients.get(msg.to)
      if (!target || target.readyState !== WebSocket.OPEN) return

      // Пересылаем сообщение получателю с добавлением from
      target.send(JSON.stringify({ ...msg, from: userId }))
    } catch {}
  })

  ws.on('close', () => {
    clients.delete(userId)
    console.log(`[WS] disconnected: ${userId} (total: ${clients.size})`)
  })

  ws.on('error', () => clients.delete(userId))

  // Подтверждение подключения
  ws.send(JSON.stringify({ type: 'connected', userId }))
})

server.listen(PORT, () => {
  console.log(`[WS] WebRTC signaling server running on port ${PORT}`)
})

// Graceful shutdown
process.once('SIGINT', () => { wss.close(); server.close(); process.exit(0) })
process.once('SIGTERM', () => { wss.close(); server.close(); process.exit(0) })
