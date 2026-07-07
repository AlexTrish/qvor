import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

export type TranslationPack = Record<string, string>

export const DEFAULT_LANGUAGES = ['en', 'ru'] as const
export type DefaultLanguage = (typeof DEFAULT_LANGUAGES)[number]

const TRANSLATIONS_DIR = path.join(process.cwd(), 'translations')
const DEFAULT_DIR = path.join(TRANSLATIONS_DIR, 'default')
const CUSTOM_DIR = path.join(TRANSLATIONS_DIR, 'custom')

const languageTitles: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
}

const packSchema = z.record(z.string(), z.string())

export const customLanguagePackSchema = z.object({
  name: z.string().regex(/^[a-z0-9_-]{1,32}$/),
  translations: packSchema,
})

function getPackFilePath(lang: string): string {
  if (DEFAULT_LANGUAGES.includes(lang as DefaultLanguage)) {
    return path.join(DEFAULT_DIR, `${lang}.json`)
  }
  return path.join(CUSTOM_DIR, `${lang}.json`)
}

export async function listLanguagePacks(): Promise<Array<{ id: string; title: string; source: 'default' | 'custom' }>> {
  const packs: Array<{ id: string; title: string; source: 'default' | 'custom' }> = []

  for (const lang of DEFAULT_LANGUAGES) {
    packs.push({ id: lang, title: languageTitles[lang] ?? lang, source: 'default' })
  }

  try {
    const items = await fs.readdir(CUSTOM_DIR)
    for (const item of items) {
      if (item.endsWith('.json')) {
        packs.push({ id: item.replace(/\.json$/i, ''), title: item.replace(/\.json$/i, ''), source: 'custom' })
      }
    }
  } catch {
    // ignore missing custom directory
  }

  return packs
}

export async function loadLanguagePack(lang: string): Promise<TranslationPack | null> {
  const filePath = getPackFilePath(lang)
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    return packSchema.parse(parsed)
  } catch {
    return null
  }
}

export async function saveCustomLanguagePack(name: string, translations: TranslationPack): Promise<void> {
  const parsed = customLanguagePackSchema.parse({ name, translations })
  const targetPath = getPackFilePath(parsed.name)
  await fs.mkdir(CUSTOM_DIR, { recursive: true })

  try {
    await fs.access(targetPath)
    throw new Error(`Language pack with name ${parsed.name} already exists`)
  } catch (err) {
    if ((err as { code?: string }).code !== 'ENOENT') {
      throw err
    }
  }

  await fs.writeFile(targetPath, JSON.stringify(parsed.translations, null, 2), 'utf-8')
}

export function detectPreferredLanguage(countryCode?: string | null, acceptLanguage?: string | null): 'ru' | 'en' {
  return 'en'
}
