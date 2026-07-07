import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

export function apiError(
  error: unknown,
  context: string,
  status = 500,
): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { data: null, error: error.issues[0]?.message ?? 'Validation error', issues: error.issues },
      { status: 400 },
    )
  }

  if (error instanceof Error) {
    // Prisma known errors
    if ('code' in error) {
      const code = (error as { code: string }).code
      if (code === 'P2002') {
        return NextResponse.json({ data: null, error: 'Уже существует' }, { status: 409 })
      }
      if (code === 'P2025') {
        return NextResponse.json({ data: null, error: 'Не найдено' }, { status: 404 })
      }
    }

    logger.error(`[${context}] ${error.message}`)
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ data: null, error: error.message }, { status })
    }
  } else {
    logger.error(`[${context}] ${String(error)}`)
  }

  return NextResponse.json({ data: null, error: 'Internal server error' }, { status })
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status })
}
