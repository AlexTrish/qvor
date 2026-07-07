'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { AppNav } from '@/components/AppNav'
import { Users } from 'lucide-react'

export default function FriendsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Users className="size-8 text-muted-foreground" strokeWidth={1} />
        </div>
        <p className="text-sm font-medium">{t('nav.contacts')}</p>
        <p className="text-xs text-muted-foreground">Скоро</p>
      </div>
    </div>
  )
}
