import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d'

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR' | 'TESTER' | 'FAMOUS' | 'SUPER_ADMIN'

const ALL_ROLES: UserRole[] = ['USER', 'ADMIN', 'MODERATOR', 'TESTER', 'FAMOUS', 'SUPER_ADMIN']

// Роль кодируется как хэш — не хранится в открытом виде в JWT
const ROLE_SALT = process.env.ROLE_SALT ?? process.env.JWT_SECRET ?? 'fallback'

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(ROLE_SALT),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Buffer.from(sig).toString('base64url')
}

export async function encodeRole(role: UserRole): Promise<string> {
  const h = await hmac(role)
  return `${h}.${Buffer.from(role).toString('base64url')}`
}

export async function decodeRole(encoded: string): Promise<UserRole> {
  try {
    const [h, b] = encoded.split('.')
    const role = Buffer.from(b, 'base64url').toString() as UserRole
    const expected = await hmac(role)
    if (h !== expected) return 'USER'
    return role
  } catch { return 'USER' }
}

export type JwtPayload = {
  userId: string
  phone: string
  username?: string
  createdAt?: string
  role: UserRole
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  const encodedRole = await encodeRole(payload.role)
  return new SignJWT({
    phone: payload.phone,
    username: payload.username ?? null,
    createdAt: payload.createdAt ?? null,
    r: encodedRole, // роль под нейтральным ключом, не 'role'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret)
}

export async function signRefreshToken(payload: JwtPayload): Promise<string> {
  const encodedRole = await encodeRole(payload.role)
  return new SignJWT({
    phone: payload.phone,
    r: encodedRole,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES_IN)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  const role = await decodeRole((payload['r'] as string) ?? '')
  const userId = (payload.sub || payload['userId'] || payload['sub']) as string | undefined
  if (!userId) throw new Error('Invalid token: no userId')
  return {
    userId,
    phone: payload['phone'] as string,
    username: payload['username'] as string | undefined,
    createdAt: payload['createdAt'] as string | undefined,
    role,
  }
}
