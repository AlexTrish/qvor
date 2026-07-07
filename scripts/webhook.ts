#!/usr/bin/env tsx
/**
 * Управление Telegram webhook
 * Использование:
 *   npm run bot:webhook:set    — установить webhook
 *   npm run bot:webhook:delete — удалить webhook (переключиться на polling)
 *   npm run bot:webhook:info   — информация о текущем webhook
 */

import { readFileSync } from 'fs'
import path from 'path'

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

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set'); process.exit(1) }

const API = `https://api.telegram.org/bot${TOKEN}`
const action = process.argv[2] ?? 'info'

async function main() {
  if (action === 'set') {
    if (!APP_URL) { console.error('NEXT_PUBLIC_APP_URL not set'); process.exit(1) }
    const webhookUrl = `${APP_URL}/api/bot`
    const body: Record<string, string> = { url: webhookUrl }
    if (SECRET) body.secret_token = SECRET
    const res = await fetch(`${API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, allowed_updates: ['message', 'callback_query'] }),
    })
    const json = await res.json()
    console.log('setWebhook:', json)
  } else if (action === 'delete') {
    const res = await fetch(`${API}/deleteWebhook`, { method: 'POST' })
    const json = await res.json()
    console.log('deleteWebhook:', json)
  } else {
    const res = await fetch(`${API}/getWebhookInfo`)
    const json = await res.json()
    console.log('webhookInfo:', JSON.stringify(json.result, null, 2))
  }
}

main().catch(console.error)
