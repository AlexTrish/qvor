import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(request: NextRequest) {
  const user = await auth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Короткоживущий токен только для WS handshake (2 минуты)
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2m')
    .sign(secret)

  return NextResponse.json({ data: { token } })
}
