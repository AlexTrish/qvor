import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOtp, saveOtp, sendOtp, isTelegramLinked } from '@/lib/auth/otp'
import { isMockEnabled, findMockUserByPhone, MOCK_OTP } from '@/lib/dev/mock-users'
import { rateLimit } from '@/lib/rate-limit'
import { apiLogger as logger } from '@/lib/logger'

const schema = z.object({
  phone: z.string().regex(/^\+?\d{7,15}$/, 'Некорректный номер телефона'),
  channel: z.enum(['email', 'telegram', 'console']).optional(),
})

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, channel } = parsed.data
    const normalizedPhone = phone.replace(/^\+/, '')

    // Мок для разработки
    if (isMockEnabled()) {
      const mockUser = findMockUserByPhone(normalizedPhone)
      if (mockUser) {
        logger.debug('Mock OTP', { phone: normalizedPhone, code: MOCK_OTP })
        return NextResponse.json({ data: { sent: true, channel: 'mock' }, error: null })
      }
    }

    const code = generateOtp()
    await saveOtp(normalizedPhone, code)

    try {
      const sentChannel = await sendOtp(normalizedPhone, code, channel)
      return NextResponse.json({ data: { sent: true, channel: sentChannel }, error: null })
    } catch (err) {
      const msg = String(err)
      if (msg.includes('TELEGRAM_NOT_LINKED')) {
        return NextResponse.json({ data: null, error: 'TELEGRAM_NOT_LINKED' }, { status: 400 })
      }
      throw err
    }
  } catch (err) {
    logger.error('send-otp error', { err: String(err) })
    return NextResponse.json({ data: null, error: String(err) }, { status: 500 })
  }
}
