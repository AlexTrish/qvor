// Universal logger — works in Next.js API routes, middleware, and bot

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

const C = {
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
  blue:    '\x1b[34m',
  white:   '\x1b[97m',
}

type Level = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'trace'

const LEVEL_COLOR: Record<Level, string> = {
  info:    C.cyan,
  success: C.green,
  warn:    C.yellow,
  error:   C.red,
  debug:   C.magenta,
  trace:   C.gray,
}

const LEVEL_ICON: Record<Level, string> = {
  info:    '●',
  success: '✓',
  warn:    '⚠',
  error:   '✗',
  debug:   '◆',
  trace:   '·',
}

const HTTP_METHOD_COLOR: Record<string, string> = {
  GET:    C.green,
  POST:   C.blue,
  PATCH:  C.yellow,
  PUT:    C.yellow,
  DELETE: C.red,
}

function ts(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatMeta(meta: Record<string, unknown>): string {
  const parts = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return `${DIM}${k}${RESET}${DIM}=${RESET}${BOLD}${val}${RESET}`
    })
  return parts.length ? `  ${DIM}│${RESET} ${parts.join(`  `)}` : ''
}

function write(level: Level, scope: string, message: string, meta?: Record<string, unknown>): void {
  const isDev = process.env.NODE_ENV !== 'production'
  if ((level === 'debug' || level === 'trace') && !isDev) return

  const color = LEVEL_COLOR[level]
  const icon  = LEVEL_ICON[level]
  const tag   = `${color}${BOLD}${icon} ${level.toUpperCase().padEnd(7)}${RESET}`
  const scopeTag = `${DIM}[${scope}]${RESET}`
  const metaStr  = meta ? formatMeta(meta) : ''

  const line = `${DIM}${ts()}${RESET}  ${tag}  ${scopeTag}  ${BOLD}${message}${RESET}${metaStr}`
  ;(level === 'error' ? process.stderr : process.stdout).write(line + '\n')
}

// ─── Generic logger factory ──────────────────────────────────────────────────
function createLogger(scope: string) {
  return {
    info:    (msg: string, meta?: Record<string, unknown>) => write('info',    scope, msg, meta),
    success: (msg: string, meta?: Record<string, unknown>) => write('success', scope, msg, meta),
    warn:    (msg: string, meta?: Record<string, unknown>) => write('warn',    scope, msg, meta),
    error:   (msg: string, meta?: Record<string, unknown>) => {
      write('error', scope, msg, meta)
      // Отправляем в Sentry если DSN задан
      if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
        try {
          // Динамический импорт — не блокируем загрузку если Sentry не нужен
          const Sentry = require('@sentry/nextjs')
          const err = meta?.error instanceof Error ? meta.error : new Error(`[${scope}] ${msg}`)
          Sentry.captureException(err, { extra: { scope, ...meta } })
        } catch { /* Sentry недоступен */ }
      }
    },
    debug:   (msg: string, meta?: Record<string, unknown>) => write('debug',   scope, msg, meta),
    trace:   (msg: string, meta?: Record<string, unknown>) => write('trace',   scope, msg, meta),
  }
}

// ─── API logger ──────────────────────────────────────────────────────────────
const _api = createLogger('api')

export const apiLogger = {
  ..._api,

  req(method: string, path: string, meta?: Record<string, unknown>) {
    const mColor = HTTP_METHOD_COLOR[method] ?? C.white
    const mTag = `${mColor}${BOLD}${method.padEnd(6)}${RESET}`
    const line = `${DIM}${ts()}${RESET}  ${LEVEL_COLOR.trace}${BOLD}→ REQUEST ${RESET}  ${DIM}[api]${RESET}  ${mTag} ${BOLD}${path}${RESET}${meta ? formatMeta(meta) : ''}`
    process.stdout.write(line + '\n')
  },

  res(method: string, path: string, status: number, ms: number) {
    const level: Level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'success'
    const sColor = status >= 500 ? C.red : status >= 400 ? C.yellow : C.green
    const mColor = HTTP_METHOD_COLOR[method] ?? C.white
    const tag = `${LEVEL_COLOR[level]}${BOLD}${LEVEL_ICON[level]} ${level.toUpperCase().padEnd(7)}${RESET}`
    const line = `${DIM}${ts()}${RESET}  ${tag}  ${DIM}[api]${RESET}  ${mColor}${BOLD}${method.padEnd(6)}${RESET} ${BOLD}${path}${RESET}  ${DIM}│${RESET}  ${sColor}${BOLD}${status}${RESET}  ${DIM}${ms}ms${RESET}`
    ;(level === 'error' ? process.stderr : process.stdout).write(line + '\n')
  },
}

// ─── Bot logger ───────────────────────────────────────────────────────────────
const _bot = createLogger('bot')

export const botLogger = {
  ..._bot,

  incoming(from: { id?: number; username?: string; first_name?: string }, text: string) {
    write('trace', 'bot', `← ${text}`, {
      from: from.username ? `@${from.username}` : (from.first_name ?? '?'),
      id: from.id,
    })
  },

  reply(chatId: number, preview: string) {
    write('trace', 'bot', `→ ${preview.slice(0, 70)}${preview.length > 70 ? '…' : ''}`, { chatId })
  },

  linked(method: 'deeplink' | 'contact' | 'text', phone: string, chatId: number, telegramId?: number) {
    write('success', 'bot', `Phone linked via ${method}`, {
      phone: phone.slice(0, 4) + '****' + phone.slice(-2),
      chatId,
      ...(telegramId && { telegramId }),
    })
  },

  command(name: string, from: { id?: number; username?: string }, args?: string) {
    write('info', 'bot', `Command /${name}`, {
      from: from.username ? `@${from.username}` : String(from.id ?? '?'),
      ...(args && { args: args.slice(0, 30) }),
    })
  },

  otpSent(chatId: number, phone: string) {
    write('success', 'bot', 'OTP sent', {
      phone: phone.slice(0, 4) + '****' + phone.slice(-2),
      chatId,
    })
  },
}

// ─── Default logger (for lib/* modules) ──────────────────────────────────────
export const logger = createLogger('app')
