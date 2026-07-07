import { readFileSync } from 'fs'
import path from 'path'
import { Bot, Keyboard, Context } from 'grammy'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { botLogger as log } from '../lib/bot/logger'

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

// ─── Prisma ───────────────────────────────────────────────────────────────────
log.info('PostgreSQL: connecting...', {
  url: (process.env.DATABASE_URL ?? '').replace(/:([^@]+)@/, ':****@'),
})
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

db.$connect()
  .then(() => log.success('PostgreSQL: connected'))
  .catch((err: unknown) => log.error('PostgreSQL: connection failed', { error: String(err) }))

// ─── TempStore helpers ────────────────────────────────────────────────────────
async function dbSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await db.tempStore.upsert({
    where: { key },
    update: { value, expiresAt },
    create: { key, value, expiresAt },
  })
  log.trace('TempStore: SET', { key, ttl: ttlSeconds + 's' })
}

async function dbGet(key: string): Promise<string | null> {
  const row = await db.tempStore.findUnique({ where: { key } })
  if (!row) { log.trace('TempStore: GET miss', { key }); return null }
  if (row.expiresAt < new Date()) {
    await db.tempStore.delete({ where: { key } }).catch(() => null)
    log.trace('TempStore: GET expired', { key })
    return null
  }
  log.trace('TempStore: GET hit', { key })
  return row.value
}

async function dbDel(key: string): Promise<void> {
  await db.tempStore.delete({ where: { key } }).catch(() => null)
  log.trace('TempStore: DEL', { key })
}

async function cleanExpired(): Promise<void> {
  const { count } = await db.tempStore.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  if (count > 0) log.info('TempStore: cleaned expired rows', { count })
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) { log.error('TELEGRAM_BOT_TOKEN is not set — exiting'); process.exit(1) }

log.info('Initializing bot...')
log.info('Environment', { NODE_ENV: process.env.NODE_ENV, pid: process.pid })

// Прокси для Telegram API
const proxyUrl = process.env.TELEGRAM_PROXY_URL
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined
if (agent) log.info('Using proxy', { proxy: proxyUrl!.replace(/:[^@]+@/, ':****@') })

const bot = new Bot(BOT_TOKEN, {
  client: agent ? { baseFetchConfig: { agent } } : undefined,
})

// ─── i18n ─────────────────────────────────────────────────────────────────────
const RU_LANGS = new Set(['ru', 'be', 'uk'])
function isRu(ctx: Context): boolean {
  return RU_LANGS.has((ctx.from?.language_code ?? '').toLowerCase().slice(0, 2))
}

type TValue = string | ((...args: string[]) => string)
type TKey = 'welcome' | 'sharePhone' | 'linked' | 'alreadyLinked' | 'wrongContact' |
  'tokenExpired' | 'unlinked' | 'notLinkedUnlink' | 'help' | 'unknownCommand' | 'sendNumber' |
  'completeReg' | 'regCompleted'

const T: Record<TKey, { ru: TValue; en: TValue }> & {
  status: { linked: { ru: string; en: string }; notLinked: { ru: string; en: string } }
} = {
  welcome:         { ru: (n: string) => `👋 Привет, *${n}*\\!\n\nЯ бот *QVOR* — безопасного мессенджера\\.\n\nПоделитесь номером телефона:`, en: (n: string) => `👋 Hey, *${n}*\\!\n\nI'm the *QVOR* bot\\.\n\nPlease share your phone number:` },
  sharePhone:      { ru: '📱 Поделиться номером', en: '📱 Share phone number' },
  linked:          { ru: '✅ *Номер привязан\\!*\n\nВернитесь в QVOR и нажмите *«Прислать код»*\\.', en: '✅ *Phone linked\\!*\n\nReturn to QVOR and tap *"Send code"*\\.' },
  alreadyLinked:   { ru: '⚠️ Этот номер уже привязан к другому Telegram\\.', en: '⚠️ This number is already linked to another Telegram\\.' },
  wrongContact:    { ru: '❌ Поделитесь *своим* номером\\.', en: '❌ Please share *your own* number\\.' },
  tokenExpired:    { ru: '❌ Ссылка устарела\\. Запросите новую в QVOR\\.', en: '❌ Link expired\\. Request a new one in QVOR\\.' },
  unlinked:        { ru: '✅ Аккаунт отвязан\\.', en: '✅ Account unlinked\\.' },
  notLinkedUnlink: { ru: '❌ Аккаунт не был привязан\\.', en: '❌ Account was not linked\\.' },
  help:            { ru: '🤖 *QVOR Bot*\n\n/start — привязать аккаунт\n/status — статус\n/unlink — отвязать\n/help — справка', en: '🤖 *QVOR Bot*\n\n/start — link account\n/status — status\n/unlink — unlink\n/help — help' },
  unknownCommand:  { ru: '❓ Неизвестная команда\\. /help', en: '❓ Unknown command\\. /help' },
  sendNumber:      { ru: 'ℹ️ Отправьте номер в формате \\+79991234567\\.', en: 'ℹ️ Send your number in format \\+79991234567\\.' },
  completeReg:     { ru: '🎉 *Почти готово\\!*\n\nПоделитесь номером телефона, чтобы завершить регистрацию в QVOR:', en: '🎉 *Almost done\\!*\n\nShare your phone number to complete QVOR registration:' },
  regCompleted:    { ru: '✅ *Регистрация завершена\\!*\n\nДобро пожаловать в QVOR\\.', en: '✅ *Registration complete\\!*\n\nWelcome to QVOR\\.' },
  status: {
    linked:    { ru: '✅ *Статус: привязан*\n\nTelegram подключён к QVOR\\.', en: '✅ *Status: linked*\n\nTelegram is connected to QVOR\\.' },
    notLinked: { ru: '❌ *Статус: не привязан*\n\nИспользуйте /start\\.', en: '❌ *Status: not linked*\n\nUse /start\\.' },
  },
}

function t(key: TKey, ctx: Context, ...args: string[]): string {
  const val = isRu(ctx) ? T[key].ru : T[key].en
  return typeof val === 'function' ? val(...args) : val
}

function contactKeyboard(ctx: Context): Keyboard {
  return new Keyboard().requestContact(t('sharePhone', ctx)).resized().oneTime()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function linkPhone(phone: string, chatId: number, telegramId?: number, langCode?: string): Promise<void> {
  await dbSet(`tg:chat:${phone}`, String(chatId), 365 * 24 * 3600)
  if (langCode) await dbSet(`tg:lang:${chatId}`, langCode, 365 * 24 * 3600)
  log.trace('Phone→chatId saved', { phone: phone.slice(0, 4) + '****', chatId })

  if (telegramId) {
    log.debug('Updating telegramChatId in DB', { telegramId, chatId })
    db.user.updateMany({
      where: { telegramId: BigInt(telegramId) },
      data: { telegramChatId: BigInt(chatId) },
    }).then((r) => {
      if (r.count > 0) log.success('telegramChatId updated', { telegramId, chatId })
      else log.debug('No user found with telegramId', { telegramId })
    }).catch((err: unknown) => log.error('DB update failed', { error: String(err) }))
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const token = ctx.match?.trim() ?? ''
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id
  const from = ctx.from ?? {}

  log.command('start', from, token || '(no token)')
  log.incoming(from, `/start${token ? ` ${token.slice(0, 8)}…` : ' (plain)'}`)

  if (token.length > 0) {
    // reg:{token} — завершение регистрации через TG: просим поделиться номером
    if (token.startsWith('reg:')) {
      const regToken = token.slice(4)
      const pending = await dbGet(`tg:reg:${regToken}`)
      if (!pending) {
        await ctx.reply(t('tokenExpired', ctx), { parse_mode: 'MarkdownV2' })
        return
      }
      // Сохраняем regToken в контексте чата чтобы обработать contact
      await dbSet(`tg:reg:pending:${chatId}`, regToken, 10 * 60)
      await ctx.reply(t('completeReg', ctx), {
        parse_mode: 'MarkdownV2',
        reply_markup: contactKeyboard(ctx),
      })
      return
    }

    const phone = await dbGet(`tg:link:${token}`)
    if (!phone) {
      log.warn('Token not found or expired', { token: token.slice(0, 8) + '…', chatId })
      await ctx.reply(t('tokenExpired', ctx), { parse_mode: 'MarkdownV2' })
      return
    }
    await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
    await dbDel(`tg:link:${token}`)
    log.linked('deeplink', phone, chatId, telegramId)
    await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  await ctx.reply(t('welcome', ctx, ctx.from?.first_name ?? 'there'), {
    parse_mode: 'MarkdownV2',
    reply_markup: contactKeyboard(ctx),
  })
})

bot.command('help', async (ctx) => {
  log.command('help', ctx.from ?? {})
  await ctx.reply(t('help', ctx), { parse_mode: 'MarkdownV2' })
})

bot.command('status', async (ctx) => {
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id
  log.command('status', ctx.from ?? {})

  let linked = false
  if (telegramId) {
    try {
      const user = await db.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { telegramChatId: true },
      })
      if (user?.telegramChatId) linked = true
    } catch (err) { log.warn('DB lookup failed', { error: String(err) }) }
  }
  if (!linked) {
    const cached = await dbGet(`tg:chat:${chatId}`)
    if (cached) linked = true
  }

  const msg = linked
    ? (isRu(ctx) ? T.status.linked.ru : T.status.linked.en)
    : (isRu(ctx) ? T.status.notLinked.ru : T.status.notLinked.en)
  await ctx.reply(msg, { parse_mode: 'MarkdownV2' })
})

bot.command('unlink', async (ctx) => {
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id
  log.command('unlink', ctx.from ?? {})

  let unlinked = false
  if (telegramId) {
    try {
      const r = await db.user.updateMany({
        where: { telegramId: BigInt(telegramId) },
        data: { telegramChatId: null },
      })
      if (r.count > 0) { unlinked = true; log.trace('Cleared telegramChatId', { telegramId }) }
    } catch (err) { log.warn('DB update failed', { error: String(err) }) }
  }

  const rows = await db.tempStore.findMany({
    where: { key: { startsWith: 'tg:chat:' }, expiresAt: { gt: new Date() } },
  })
  for (const row of rows) {
    if (row.value === String(chatId)) {
      await dbDel(row.key)
      unlinked = true
      break
    }
  }

  await ctx.reply(unlinked ? t('unlinked', ctx) : t('notLinkedUnlink', ctx), { parse_mode: 'MarkdownV2' })
  if (unlinked) log.success('Phone unlinked', { chatId })
})

// ─── Contact ──────────────────────────────────────────────────────────────────
bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id
  const from = ctx.from ?? {}

  log.incoming(from, `[contact] phone=${contact.phone_number}`)

  if (contact.user_id !== telegramId) {
    log.warn('Contact belongs to another user', { chatId })
    await ctx.reply(t('wrongContact', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  const phone = contact.phone_number.replace(/\D/g, '')

  // Проверяем есть ли ожидающая регистрация
  const pendingRegToken = await dbGet(`tg:reg:pending:${chatId}`)
  if (pendingRegToken) {
    await dbDel(`tg:reg:pending:${chatId}`)
    await dbDel(`tg:reg:${pendingRegToken}`)
    await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
    // Уведомляем приложение о завершении регистрации
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://qvor.ru'
    await fetch(`${appUrl}/api/auth/telegram-bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, telegramId, chatId }),
    }).catch(() => null)
    log.success('Registration completed via TG contact', { phone: phone.slice(0, 4) + '****', chatId })
    await ctx.reply(t('regCompleted', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  const existing = await dbGet(`tg:chat:${phone}`)
  if (existing && Number(existing) !== chatId) {
    log.warn('Phone already linked to another chat', { phone: phone.slice(0, 4) + '****', chatId })
    await ctx.reply(t('alreadyLinked', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
  log.linked('contact', phone, chatId, telegramId)
  await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
})

// ─── Text ─────────────────────────────────────────────────────────────────────
bot.on('message:text', async (ctx) => {
  const text = (ctx.message.text ?? '').trim()
  const chatId = ctx.chat.id
  const from = ctx.from ?? {}

  log.incoming(from, text)

  if (text.startsWith('/')) {
    log.warn('Unknown command', { chatId, command: text.split(' ')[0] })
    await ctx.reply(t('unknownCommand', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  const cleaned = text.replace(/\D/g, '')
  if (/^\d{7,15}$/.test(cleaned)) {
    const telegramId = ctx.from?.id
    const existing = await dbGet(`tg:chat:${cleaned}`)
    if (existing && Number(existing) !== chatId) {
      log.warn('Phone already linked', { phone: cleaned.slice(0, 4) + '****', chatId })
      await ctx.reply(t('alreadyLinked', ctx), { parse_mode: 'MarkdownV2' })
      return
    }
    await linkPhone(cleaned, chatId, telegramId, ctx.from?.language_code)
    log.linked('text', cleaned, chatId, telegramId)
    await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  await ctx.reply(t('sendNumber', ctx), { parse_mode: 'MarkdownV2', reply_markup: contactKeyboard(ctx) })
})

// ─── Error handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  log.error('Unhandled bot error', { error: String(err.error), updateId: err.ctx?.update?.update_id })
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  log.warn(`Received ${signal} — shutting down gracefully...`)
  try {
    await bot.stop()
    log.info('Bot stopped')
  } catch (err) {
    if (!String(err).includes('Aborted')) log.error('Error stopping bot', { error: String(err) })
  }
  await db.$disconnect().catch(() => null)
  log.info('PostgreSQL disconnected')
  log.success('Shutdown complete')
  process.exit(0)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

// ─── Start ────────────────────────────────────────────────────────────────────
cleanExpired().then(() => {
  bot.start({
    onStart: (info) => log.success('Bot is running', { username: info.username, id: info.id }),
  })
})
