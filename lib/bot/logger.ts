export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'trace'
export type Meta = Record<string, unknown>

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m', success: '\x1b[32m', warn: '\x1b[33m',
  error: '\x1b[31m', debug: '\x1b[35m', trace: '\x1b[90m',
}
const ICONS: Record<LogLevel, string> = {
  info: '●', success: '✓', warn: '⚠', error: '✗', debug: '◆', trace: '·',
}

function ts(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmeta(meta: Meta): string {
  return Object.entries(meta)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${DIM}${k}${RESET}${DIM}=${RESET}${BOLD}${typeof v === 'object' ? JSON.stringify(v) : v}${RESET}`)
    .join('  ')
}

function write(level: LogLevel, msg: string, meta?: Meta): void {
  if ((level === 'debug' || level === 'trace') && process.env.NODE_ENV === 'production') return
  const tag = `${COLORS[level]}${BOLD}${ICONS[level]} ${level.toUpperCase().padEnd(7)}${RESET}`
  const line = `${DIM}${ts()}${RESET}  ${tag}  ${DIM}[bot]${RESET}  ${BOLD}${msg}${RESET}${meta ? `  ${DIM}│${RESET} ${fmeta(meta)}` : ''}`
  ;(level === 'error' ? process.stderr : process.stdout).write(line + '\n')
}

type FromUser = { username?: string; first_name?: string; id?: number }

export const botLogger = {
  info:     (m: string, meta?: Meta) => write('info', m, meta),
  success:  (m: string, meta?: Meta) => write('success', m, meta),
  warn:     (m: string, meta?: Meta) => write('warn', m, meta),
  error:    (m: string, meta?: Meta) => write('error', m, meta),
  debug:    (m: string, meta?: Meta) => write('debug', m, meta),
  trace:    (m: string, meta?: Meta) => write('trace', m, meta),
  incoming: (from: FromUser, text: string) =>
    write('trace', `← ${text}`, { from: from.username ? `@${from.username}` : (from.first_name ?? '?'), id: from.id }),
  reply:    (chatId: number, preview: string) =>
    write('trace', `→ ${preview.slice(0, 60)}`, { chatId }),
  linked:   (method: string, phone: string, chatId: number, tgId?: number) =>
    write('success', `Phone linked via ${method}`, { phone: phone.slice(0, 4) + '****' + phone.slice(-2), chatId, ...(tgId && { tgId }) }),
  command:  (name: string, from: FromUser, args?: string) =>
    write('info', `Command /${name}`, { from: from.username ? `@${from.username}` : String(from.id ?? '?'), ...(args && { args: args.slice(0, 30) }) }),
}
