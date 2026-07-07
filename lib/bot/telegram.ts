import 'server-only'
import { Bot, Keyboard, Context } from 'grammy'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── TempStore helpers ────────────────────────────────────────────────────────
async function dbSet(key: string, value: string, ttlSeconds: number) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await prisma.tempStore.upsert({
    where: { key },
    update: { value, expiresAt },
    create: { key, value, expiresAt },
  })
}

async function dbGet(key: string): Promise<string | null> {
  const row = await prisma.tempStore.findUnique({ where: { key } })
  if (!row) return null
  if (row.expiresAt < new Date()) {
    await prisma.tempStore.delete({ where: { key } }).catch(() => null)
    return null
  }
  return row.value
}

async function dbDel(key: string) {
  await prisma.tempStore.delete({ where: { key } }).catch(() => null)
}

// ─── Bot singleton ────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set')

const proxyUrl = process.env.TELEGRAM_PROXY_URL
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

export const bot = new Bot(BOT_TOKEN, {
  client: agent ? { baseFetchConfig: { agent } } : undefined,
})

// ─── i18n ─────────────────────────────────────────────────────────────────────
const RU_LANGS = new Set(['ru', 'be', 'uk'])
function isRu(ctx: Context) {
  return RU_LANGS.has((ctx.from?.language_code ?? '').toLowerCase().slice(0, 2))
}

type TKey = 'welcome' | 'sharePhone' | 'linked' | 'alreadyLinked' | 'wrongContact' |
  'tokenExpired' | 'unlinked' | 'notLinkedUnlink' | 'help' | 'unknownCommand' | 'sendNumber' |
  'completeReg' | 'regCompleted' | 'tgAuthRequest' | 'tgAuthDone' | 'meNotLinked'

type TValue = string | ((...args: string[]) => string)
const T: Record<TKey, { ru: TValue; en: TValue }> & {
  status: { linked: { ru: string; en: string }; notLinked: { ru: string; en: string } }
} = {
  welcome:         { ru: (n: string) => `👋 Привет, *${n}*\\!\n\nЯ бот *QVOR*\\.\n\nПоделитесь номером телефона:`, en: (n: string) => `👋 Hey, *${n}*\\!\n\nI'm the *QVOR* bot\\.\n\nPlease share your phone number:` },
  sharePhone:      { ru: '📱 Поделиться номером', en: '📱 Share phone number' },
  linked:          { ru: '✅ *Номер привязан\\!*\n\nВернитесь в QVOR и нажмите *«Прислать код»*\\.', en: '✅ *Phone linked\\!*\n\nReturn to QVOR and tap *"Send code"*\\.' },
  alreadyLinked:   { ru: '⚠️ Этот номер уже привязан к другому Telegram\\.', en: '⚠️ This number is already linked to another Telegram\\.' },
  wrongContact:    { ru: '❌ Поделитесь *своим* номером\\.', en: '❌ Please share *your own* number\\.' },
  tokenExpired:    { ru: '❌ Ссылка устарела\\. Запросите новую в QVOR\\.', en: '❌ Link expired\\. Request a new one in QVOR\\.' },
  unlinked:        { ru: '✅ Аккаунт отвязан\\.', en: '✅ Account unlinked\\.' },
  notLinkedUnlink: { ru: '❌ Аккаунт не был привязан\\.', en: '❌ Account was not linked\\.' },
  help:            { ru: '🤖 *QVOR Bot*\n\n/start — привязать аккаунт\n/me — мой аккаунт\n/status — статус\n/unlink — отвязать\n/help — справка', en: '🤖 *QVOR Bot*\n\n/start — link account\n/me — my account\n/status — status\n/unlink — unlink\n/help — help' },
  unknownCommand:  { ru: '❓ Неизвестная команда\\. /help', en: '❓ Unknown command\\. /help' },
  sendNumber:      { ru: 'ℹ️ Отправьте номер в формате \\+79991234567\\.', en: 'ℹ️ Send your number in format \\+79991234567\\.' },
  completeReg:     { ru: '🎉 *Почти готово\\!*\n\nПоделитесь номером телефона, чтобы завершить регистрацию в QVOR:', en: '🎉 *Almost done\\!*\n\nShare your phone number to complete QVOR registration:' },
  regCompleted:    { ru: '✅ *Регистрация завершена\\!*\n\nДобро пожаловать в QVOR\\.', en: '✅ *Registration complete\\!*\n\nWelcome to QVOR\\.' },
  tgAuthRequest:   { ru: '🔐 *Авторизация в QVOR*\n\nПоделитесь номером телефона для входа:', en: '🔐 *QVOR Sign in*\n\nShare your phone number to sign in:' },
  tgAuthDone:      { ru: '✅ *Готово\\!*\n\nВернитесь в браузер — вход выполнен автоматически\\.', en: '✅ *Done\\!*\n\nReturn to your browser — you are now signed in\\.' },
  meNotLinked:     { ru: '❌ Аккаунт не привязан\\. Используйте /start', en: '❌ Account not linked\\. Use /start' },
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

async function linkPhone(phone: string, chatId: number, telegramId?: number, langCode?: string) {
  await dbSet(`tg:chat:${phone}`, String(chatId), 365 * 24 * 3600)
  if (langCode) await dbSet(`tg:lang:${chatId}`, langCode, 365 * 24 * 3600)
  if (telegramId) {
    await prisma.user.updateMany({
      where: { telegramId: BigInt(telegramId) },
      data: { telegramChatId: BigInt(chatId) },
    }).catch(() => null)
  }
}

// Rate limiting: max 3 попытки привязки в час на chatId
async function checkLinkRateLimit(chatId: number): Promise<boolean> {
  const key = `tg:ratelimit:link:${chatId}`
  const row = await prisma.tempStore.findUnique({ where: { key } })
  const now = Date.now()
  if (!row || row.expiresAt < new Date()) {
    await prisma.tempStore.upsert({
      where: { key },
      update: { value: '1', expiresAt: new Date(now + 3600 * 1000) },
      create: { key, value: '1', expiresAt: new Date(now + 3600 * 1000) },
    })
    return true
  }
  const count = parseInt(row.value, 10)
  if (count >= 3) return false
  await prisma.tempStore.update({ where: { key }, data: { value: String(count + 1) } })
  return true
}

// ─── Commands ─────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const token = ctx.match?.trim() ?? ''
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id

  if (token.length > 0) {
    if (token.startsWith('tgauth_')) {
      const authToken = token.slice(7)
      const row = await prisma.tempStore.findUnique({ where: { key: `tgauth:${authToken}` } })
      if (!row || row.expiresAt < new Date()) {
        await ctx.reply(t('tokenExpired', ctx), { parse_mode: 'MarkdownV2' })
        return
      }
      await dbSet(`tgauth:pending:${chatId}`, authToken, 10 * 60)
      await ctx.reply(t('tgAuthRequest', ctx), { parse_mode: 'MarkdownV2', reply_markup: contactKeyboard(ctx) })
      return
    }

    if (token.startsWith('reg:')) {
      const regToken = token.slice(4)
      const pending = await dbGet(`tg:reg:${regToken}`)
      if (!pending) { await ctx.reply(t('tokenExpired', ctx), { parse_mode: 'MarkdownV2' }); return }
      await dbSet(`tg:reg:pending:${chatId}`, regToken, 10 * 60)
      await ctx.reply(t('completeReg', ctx), { parse_mode: 'MarkdownV2', reply_markup: contactKeyboard(ctx) })
      return
    }
    const phone = await dbGet(`tg:link:${token}`)
    if (!phone) { await ctx.reply(t('tokenExpired', ctx), { parse_mode: 'MarkdownV2' }); return }
    await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
    await dbDel(`tg:link:${token}`)
    await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  await ctx.reply(t('welcome', ctx, ctx.from?.first_name ?? 'there'), {
    parse_mode: 'MarkdownV2',
    reply_markup: contactKeyboard(ctx),
  })
})

bot.command('help', async (ctx) => {
  await ctx.reply(t('help', ctx), { parse_mode: 'MarkdownV2' })
})

bot.command('status', async (ctx) => {
  const telegramId = ctx.from?.id
  let linked = false
  if (telegramId) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { telegramChatId: true },
    }).catch(() => null)
    if (user?.telegramChatId) linked = true
  }
  const msg = linked
    ? (isRu(ctx) ? T.status.linked.ru : T.status.linked.en)
    : (isRu(ctx) ? T.status.notLinked.ru : T.status.notLinked.en)
  await ctx.reply(msg, { parse_mode: 'MarkdownV2' })
})

bot.command('unlink', async (ctx) => {
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id
  let unlinked = false
  if (telegramId) {
    const r = await prisma.user.updateMany({
      where: { telegramId: BigInt(telegramId) },
      data: { telegramChatId: null },
    }).catch(() => ({ count: 0 }))
    if (r.count > 0) unlinked = true
  }
  const rows = await prisma.tempStore.findMany({
    where: { key: { startsWith: 'tg:chat:' }, expiresAt: { gt: new Date() } },
  })
  for (const row of rows) {
    if (row.value === String(chatId)) { await dbDel(row.key); unlinked = true; break }
  }
  await ctx.reply(unlinked ? t('unlinked', ctx) : t('notLinkedUnlink', ctx), { parse_mode: 'MarkdownV2' })
})

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact
  const chatId = ctx.chat.id
  const telegramId = ctx.from?.id

  if (contact.user_id !== telegramId) {
    await ctx.reply(t('wrongContact', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  const phone = contact.phone_number.replace(/\D/g, '')
  const pendingAuthToken = await dbGet(`tgauth:pending:${chatId}`)
  if (pendingAuthToken) {
    await dbDel(`tgauth:pending:${chatId}`)
    // Записываем номер в токен — poll эндпоинт его подхватит
    await prisma.tempStore.update({
      where: { key: `tgauth:${pendingAuthToken}` },
      data: { value: phone },
    }).catch(() => null)
    await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
    await ctx.reply(t('tgAuthDone', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  const pendingRegToken = await dbGet(`tg:reg:pending:${chatId}`)
  if (pendingRegToken) {
    await dbDel(`tg:reg:pending:${chatId}`)
    await dbDel(`tg:reg:${pendingRegToken}`)
    await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://qvor.ru'
    await fetch(`${appUrl}/api/auth/telegram-bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, telegramId, chatId }),
    }).catch(() => null)
    await ctx.reply(t('regCompleted', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  const existing = await dbGet(`tg:chat:${phone}`)
  if (existing && Number(existing) !== chatId) {
    await ctx.reply(t('alreadyLinked', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  // Rate limiting: max 3 попытки привязки в час
  const allowed = await checkLinkRateLimit(chatId)
  if (!allowed) {
    const ru = isRu(ctx)
    await ctx.reply(ru ? '⏳ Слишком много попыток\\. Попробуйте через час\\.' : '⏳ Too many attempts\\. Try again in an hour\.', { parse_mode: 'MarkdownV2' })
    return
  }

  await linkPhone(phone, chatId, telegramId, ctx.from?.language_code)
  await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
})

bot.on('message:text', async (ctx) => {
  const text = (ctx.message.text ?? '').trim()
  const chatId = ctx.chat.id

  if (text.startsWith('/')) {
    await ctx.reply(t('unknownCommand', ctx), { parse_mode: 'MarkdownV2' })
    return
  }

  const cleaned = text.replace(/\D/g, '')
  if (/^\d{7,15}$/.test(cleaned)) {
    const telegramId = ctx.from?.id
    const existing = await dbGet(`tg:chat:${cleaned}`)
    if (existing && Number(existing) !== chatId) {
      await ctx.reply(t('alreadyLinked', ctx), { parse_mode: 'MarkdownV2' })
      return
    }
    await linkPhone(cleaned, chatId, telegramId, ctx.from?.language_code)
    await ctx.reply(t('linked', ctx), { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } })
    return
  }

  await ctx.reply(t('sendNumber', ctx), { parse_mode: 'MarkdownV2', reply_markup: contactKeyboard(ctx) })
})

bot.command('me', async (ctx) => {
  const telegramId = ctx.from?.id
  if (!telegramId) return
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    select: { displayName: true, username: true, numericId: true, isOnline: true },
  }).catch(() => null)
  if (!user) {
    await ctx.reply(t('meNotLinked', ctx), { parse_mode: 'MarkdownV2' })
    return
  }
  const ru = isRu(ctx)
  const name = user.displayName || user.username || `User ${user.numericId}`
  const escapeMd = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
  const lines = [
    `👤 *${escapeMd(name)}*`,
    user.username ? `@${escapeMd(user.username)}` : '',
    `\\#${user.numericId}`,
    user.isOnline ? (ru ? '🟢 Онлайн' : '🟢 Online') : (ru ? '⚪️ Офлайн' : '⚪️ Offline'),
  ].filter(Boolean).join('\n')
  await ctx.reply(lines, { parse_mode: 'MarkdownV2' })
})

bot.catch((err) => {
  logger.error('[Bot] Unhandled error', { error: String(err.error) })
})
