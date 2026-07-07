import 'server-only'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import nodeFetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const RU_LANGS = new Set(['ru', 'be', 'uk'])

async function otpText(code: string, chatId: number): Promise<string> {
  const row = await prisma.tempStore.findUnique({ where: { key: `tg:lang:${chatId}` } })
  const lang = row?.value ?? 'en'
  const isRu = RU_LANGS.has(lang.slice(0, 2))
  return isRu
    ? `🔐 *Код подтверждения QVOR*\n\n\`${code}\`\n\n_Действителен 5 минут\\. Никому не сообщайте его\\._`
    : `🔐 *QVOR Verification Code*\n\n\`${code}\`\n\n_Valid for 5 minutes\\. Never share it with anyone\\._`
}

function getAgent() {
  const proxyUrl = process.env.TELEGRAM_PROXY_URL
  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
}

async function tgFetch(method: string, body: Record<string, unknown>): Promise<Response> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not set')
  const agent = getAgent()
  const res = await nodeFetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    agent,
  } as Parameters<typeof nodeFetch>[1])
  return res as unknown as Response
}

export async function sendTelegramOtp(chatId: number, code: string): Promise<number | null> {
  const text = await otpText(code, chatId)
  let res: Response
  try {
    res = await tgFetch('sendMessage', { chat_id: chatId, text, parse_mode: 'MarkdownV2' })
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : String(err)
    logger.error('Telegram fetch failed', { chatId, error: String(err), cause: String(cause) })
    throw new Error(`TELEGRAM_FETCH_FAILED: ${cause}`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    logger.error('Telegram sendMessage failed', { chatId, status: res.status, body })
    throw new Error(`TELEGRAM_SEND_FAILED: ${res.status}`)
  }
  const json = await res.json() as { ok: boolean; result?: { message_id: number } }
  logger.info('OTP sent via Telegram', { chatId })
  return json.result?.message_id ?? null
}

export async function deleteTelegramMessage(chatId: number, messageId: number): Promise<void> {
  await tgFetch('deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => null)
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  let res: Response
  try {
    res = await tgFetch('sendMessage', { chat_id: chatId, text, ...extra })
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : String(err)
    logger.error('Telegram fetch failed', { chatId, error: String(err), cause: String(cause) })
    throw new Error(`TELEGRAM_FETCH_FAILED: ${cause}`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    logger.error('Telegram sendMessage failed', { chatId, status: res.status, body })
    throw new Error(`TELEGRAM_SEND_FAILED: ${res.status}`)
  }
}
