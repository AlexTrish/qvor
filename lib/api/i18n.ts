import { api } from './client'

export const i18nApi = {
  getPacks: () =>
    api.get<Array<{ id: string; title: string; source: 'default' | 'custom' }>>('/api/i18n/packs'),

  getPack: (lang: string) =>
    api.get<Record<string, string>>(`/api/i18n/pack/${encodeURIComponent(lang)}`),

  createPack: (name: string, translations: Record<string, string>) =>
    api.post<{ name: string }>('/api/i18n/packs', { name, translations }),
}
