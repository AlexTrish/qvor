'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { SettingsModal } from '@/components/SettingsModal'
import { Input } from '@/components/ui/input'
import { ArrowRight, Camera, Sparkles, X } from 'lucide-react'

const MAX_SIZE = 5 * 1024 * 1024

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameError, setUsernameError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError(t('profile.avatarInvalidType')); return }
    if (file.size > MAX_SIZE) { setError(t('profile.avatarTooLarge')); return }
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      setAvatarPreview(url)
      setAvatarDataUrl(url)
    }
    reader.readAsDataURL(file)
  }

  function validateUsername(v: string) {
    if (v && !/^\w{3,20}$/.test(v)) setUsernameError(t('profile.usernameHelp'))
    else setUsernameError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (usernameError) return
    setIsLoading(true); setError('')
    try {
      const body: Record<string, string | null> = {}
      if (displayName.trim()) body.displayName = displayName.trim()
      if (username.trim()) body.username = username.trim()
      if (avatarDataUrl) body.avatarUrl = avatarDataUrl

      if (Object.keys(body).length > 0) {
        const res = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) {
          if (json.error === 'Username already taken') { setUsernameError(t('onboarding.usernameTaken')); return }
          throw new Error(typeof json.error === 'string' ? json.error : t('common.unknownError'))
        }
      }
      await refreshUser()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-syne)] text-lg font-black tracking-tight">QVOR</span>
          <span className="rounded-md bg-[--accent-brand-muted] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[--accent-brand]">beta</span>
        </div>
        <SettingsModal />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-8">

          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex justify-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[--accent-brand-muted]">
                <Sparkles className="size-6 text-[--accent-brand]" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight">
              {t('onboarding.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('onboarding.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative size-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-card transition-all duration-200 hover:border-[--accent-brand]/60"
                >
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="avatar" fill className="object-cover" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors group-hover:text-[--accent-brand]">
                      <Camera className="size-7" strokeWidth={1.5} />
                      <span className="text-[10px] font-medium">{t('onboarding.addPhoto')}</span>
                    </div>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="size-6 text-white" strokeWidth={1.5} />
                    </div>
                  )}
                </button>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatarPreview(null); setAvatarDataUrl(null) }}
                    className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-destructive text-white transition-all hover:opacity-90"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('profile.avatarRequirements')}</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('profile.displayName')}
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t('profile.displayNamePlaceholder')}
                maxLength={50}
                disabled={isLoading}
                className="h-11 rounded-xl border-border bg-background px-4 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('profile.username')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">@</span>
                <Input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); validateUsername(e.target.value) }}
                  placeholder={t('profile.usernamePlaceholder')}
                  maxLength={20}
                  disabled={isLoading}
                  className="h-11 rounded-xl border-border bg-background pl-7 pr-4 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
                />
              </div>
              {usernameError
                ? <p className="text-xs text-destructive">{usernameError}</p>
                : <p className="text-xs text-muted-foreground">{t('profile.usernameHelp')}</p>
              }
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !!usernameError}
              className="btn-accent group h-11 w-full rounded-xl font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? t('common.saving') : t('onboarding.continue')}
                {!isLoading && <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={isLoading}
              className="w-full text-center text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:opacity-50"
            >
              {t('onboarding.skip')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
