import { NextResponse } from 'next/server'

import { customLanguagePackSchema, listLanguagePacks, saveCustomLanguagePack } from '@/lib/i18n'

export async function GET() {
  const packs = await listLanguagePacks()
  return NextResponse.json({ data: packs, error: null })
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = customLanguagePackSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Invalid language package payload' }, { status: 400 })
  }

  try {
    await saveCustomLanguagePack(parsed.data.name, parsed.data.translations)
    return NextResponse.json({ data: { name: parsed.data.name }, error: null }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ data: null, error: (error instanceof Error ? error.message : 'Unable to save pack') }, { status: 400 })
  }
}
