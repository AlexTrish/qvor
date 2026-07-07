import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { generateOtp, storeOtp } from '@/lib/auth/otp'
import { sendAuthCode } from '@/lib/email/mailer'
import { logger } from '@/lib/logger'

const schema = z.object({
  email: z.string().email(),
  lang: z.enum(['ru', 'en']).optional().default('ru'),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const limited = await rateLimit(`email-otp:${ip}`, 5, 60)
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { email, lang } = schema.parse(body)

    const code = generateOtp()
    await storeOtp(`email:${email}`, code)

    const result = await sendAuthCode(email, code, lang)
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    logger.info('Email OTP sent', { email })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Email OTP error', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
