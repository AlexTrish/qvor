import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { bot } from '@/lib/bot/telegram'

// Telegram webhook secret для верификации запросов
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  // Верифицируем секрет если задан
  if (WEBHOOK_SECRET) {
    const secret = request.headers.get('x-telegram-bot-api-secret-token')
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const handler = webhookCallback(bot, 'std/http')
    return await handler(request)
  } catch (err) {
    console.error('[Telegram Webhook]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
