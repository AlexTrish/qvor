import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'

export async function adminAuth(request: NextRequest) {
  const user = await auth(request)
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'SUPER_ADMIN') return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user, error: null }
}
