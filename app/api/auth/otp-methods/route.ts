import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPhone } from '@/lib/auth/password'

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone')
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }

    const phoneHash = await hashPhone(phone)
    const user = await prisma.user.findUnique({
      where: { phoneHash },
      select: { email: true, telegramChatId: true },
    })

    return NextResponse.json({
      data: {
        email: !!user?.email,
        telegram: !!user?.telegramChatId,
        console: true,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
