import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

// Set для O(1) поиска точных совпадений
const PUBLIC_EXACT = new Set(['/', '/login', '/register', '/recover', '/privacy', '/terms', '/banned', '/cookies', '/security', '/moderation', '/device-link', '/device-link/scan'])

// Префиксы публичных путей
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/i18n/',
  '/user/',
  '/id',
  '/_next',
  '/favicon',
  '/icon',
  '/apple-touch',
  '/og-image',
  '/manifest',
  '/sw.js',
]

const AUTH_PAGES = new Set(['/login', '/register', '/recover'])
const RUSSIAN_COUNTRIES = new Set(['RU', 'BY', 'UA', 'KZ', 'BY'])

function detectLang(req: NextRequest): string {
  const country = req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? ''
  if (RUSSIAN_COUNTRIES.has(country.toUpperCase())) return 'ru'
  const accept = req.headers.get('accept-language') ?? ''
  if (accept.toLowerCase().startsWith('ru') || accept.toLowerCase().startsWith('be')) return 'ru'
  return 'en'
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  // @username публичные профили — /word (3-20 символов)
  if (/^\/[a-zA-Z][a-zA-Z0-9_]{2,19}(\?.*)?$/.test(pathname)) return true
  return false
}

const IS_PROD = process.env.NODE_ENV === 'production'
const ROLE_SALT = process.env.ROLE_SALT ?? process.env.JWT_SECRET ?? 'fallback'
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? ''

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function checkCsrf(req: NextRequest): boolean {
  if (CSRF_SAFE_METHODS.has(req.method)) return true
  if (!req.nextUrl.pathname.startsWith('/api/')) return true
  // В dev — пропускаем
  if (!IS_PROD) return true
  const origin = req.headers.get('origin') ?? ''
  const host = req.headers.get('host') ?? ''
  if (!origin) {
    // Нет Origin — проверяем Referer
    const referer = req.headers.get('referer') ?? ''
    if (!referer) return false
    try { return new URL(referer).host === host } catch { return false }
  }
  try {
    const originHost = new URL(origin).host
    return originHost === host || (ALLOWED_ORIGIN ? origin === ALLOWED_ORIGIN : false)
  } catch { return false }
}

async function decodeRoleEdge(encoded: string): Promise<string> {
  try {
    if (!encoded) return 'USER'
    const [h, b] = encoded.split('.')
    if (!b) return 'USER'
    const padded = b.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b.length / 4) * 4, '=')
    const role = atob(padded)
    if (role !== 'USER' && role !== 'SUPER_ADMIN') return 'USER'
    // В dev — доверяем base64 без HMAC проверки
    if (!IS_PROD) return role
    // В prod — проверяем HMAC
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(ROLE_SALT),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    // h — base64url HMAC, переводим в ArrayBuffer для verify
    const hBase64 = h.replace(/-/g, '+').replace(/_/g, '/')
    const hPadded = hBase64.padEnd(Math.ceil(hBase64.length / 4) * 4, '=')
    const hBytes = Uint8Array.from(atob(hPadded), c => c.charCodeAt(0))
    const keyVerify = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(ROLE_SALT),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    const valid = await crypto.subtle.verify('HMAC', keyVerify, hBytes, new TextEncoder().encode(role))
    return valid ? role : 'USER'
  } catch { return 'USER' }
}

type JWTPayload = {
  sub?: string
  userId?: string
  phone?: string
  r?: string
  username?: string
  createdAt?: string
  exp?: number
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Статика — пропускаем без JWT проверки
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const accessToken = req.cookies.get('access_token')?.value
  const refreshToken = req.cookies.get('refresh_token')?.value

  // Верифицируем JWT один раз — получаем payload сразу
  let accessPayload: JWTPayload | null = null
  let refreshPayload: JWTPayload | null = null

  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, secret)
      accessPayload = payload as JWTPayload
    } catch { /* истёк или невалиден */ }
  }

  if (!accessPayload && refreshToken) {
    try {
      const { payload } = await jwtVerify(refreshToken, secret)
      refreshPayload = payload as JWTPayload
    } catch { /* невалиден */ }
  }

  const isAuthenticated = !!(accessPayload || refreshPayload)
  const currentPayload = accessPayload ?? refreshPayload
  const userId = currentPayload?.sub ?? currentPayload?.userId

  // Проверяем бан через куки (выставляется при бане)
  const isBanned = req.cookies.get('qvor_banned')?.value === '1'
  if (isBanned && pathname !== '/banned' && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/banned', req.url))
  }

  // Публичный путь
  if (isPublicPath(pathname)) {
    // Авторизованный на странице входа → /messages
    if (isAuthenticated && AUTH_PAGES.has(pathname)) {
      return NextResponse.redirect(new URL('/messages', req.url))
    }
    const res = NextResponse.next()
    if (!req.cookies.get('qvor_lang')?.value) {
      res.cookies.set('qvor_lang', detectLang(req), { path: '/', sameSite: 'lax' })
    }
    return res
  }

  // CSRF — проверяем Origin для мутирующих API запросов
  if (!checkCsrf(req)) {
    return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 })
  }

  // Защищённый путь — нужна авторизация
  if (!isAuthenticated) {
    const clearRes = pathname.startsWith('/api/')
      ? NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
    clearRes.cookies.delete('access_token')
    clearRes.cookies.delete('refresh_token')
    return clearRes
  }

  // /admin — только SUPER_ADMIN
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = await decodeRoleEdge(currentPayload?.r ?? '')
    if (role !== 'SUPER_ADMIN') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/messages', req.url))
    }
  }

  // access_token истёк — выпускаем новый из refresh
  if (!accessPayload && refreshPayload && refreshToken) {
    const newAccess = await new SignJWT({
      phone: refreshPayload.phone,
      r: refreshPayload.r,
      username: refreshPayload.username,
      createdAt: refreshPayload.createdAt,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret)

    const res = NextResponse.next()
    res.cookies.set('access_token', newAccess, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 60 * 15,
    })
    // Rolling session
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    })
    if (!req.cookies.get('qvor_lang')?.value) {
      res.cookies.set('qvor_lang', detectLang(req), { path: '/', sameSite: 'lax' })
    }
    return res
  }

  const res = NextResponse.next()
  if (!req.cookies.get('qvor_lang')?.value) {
    res.cookies.set('qvor_lang', detectLang(req), { path: '/', sameSite: 'lax' })
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
