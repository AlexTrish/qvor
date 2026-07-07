import { NextResponse } from 'next/server'
import { loadLanguagePack } from '@/lib/i18n'

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const pack = await loadLanguagePack(lang)
  if (!pack) {
    return NextResponse.json({ data: null, error: 'Language pack not found' }, { status: 404 })
  }
  return NextResponse.json({ data: pack, error: null })
}
