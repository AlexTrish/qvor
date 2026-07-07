'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Camera, X, Palette } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/hooks/useAuth'
import { ImageCropper } from '@/components/ImageCropper'
import { BannerEditor, BannerEmojiPattern, bannerStyle, type BannerConfig } from '@/components/BannerEditor'
import { compressAvatar } from '@/lib/utils/image'

type Props = {
  open: boolean
  onClose: () => void
}

export function ProfileSettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  // Avatar
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Banner
  const [bannerTab, setBannerTab] = useState(false)
  const [bannerDraft, setBannerDraft] = useState<BannerConfig | null>(null)
  const [savingBanner, setSavingBanner] = useState(false)

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? '')
      setUsername(user.username ?? '')
      setBio(user.bio ?? '')
      setBirthDate(user.birthDate ?? '')
      setSaveError('')
      setSaveOk(false)
      setBannerDraft(user.bannerConfig ? JSON.parse(user.bannerConfig) as BannerConfig : null)
      setBannerTab(false)
    }
  }, [open, user])

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleAvatarCrop(dataUrl: string) {
    setCropSrc(null)
    setAvatarUploading(true)
    try {
      const compressed = await compressAvatar(dataUrl)
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: compressed }),
      })
      await refreshUser()
    } finally { setAvatarUploading(false) }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true)
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl: null }),
    })
    await refreshUser()
    setAvatarUploading(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveError(''); setSaveOk(false)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          birthDate: birthDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : t('common.error'))
      await refreshUser()
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('common.error'))
    } finally { setSaving(false) }
  }

  async function saveBanner() {
    setSavingBanner(true)
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerConfig: bannerDraft ? JSON.stringify(bannerDraft) : null }),
    })
    await refreshUser()
    setSavingBanner(false)
    setBannerTab(false)
  }

  if (!user) return null

  const displayNameFallback = user.displayName || user.username || `User ${user.numericId}`
  const currentBanner: BannerConfig | null = user.bannerConfig ? JSON.parse(user.bannerConfig) : null

  return (
    <>
      <Dialog open={open && !cropSrc} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 shadow-xl overflow-hidden">
          {/* Banner preview */}
          <div className="relative h-24 w-full" style={bannerStyle(currentBanner)}>
            {currentBanner?.type === 'emoji' && currentBanner.emoji && (
              <BannerEmojiPattern emoji={currentBanner.emoji} opacity={currentBanner.emojiOpacity ?? 50} />
            )}
            <button
              type="button"
              onClick={() => setBannerTab(v => !v)}
              className={cn(
                'absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/50',
                bannerTab && 'bg-black/60',
              )}
            >
              <Palette className="size-3" strokeWidth={1.5} />
              Баннер
            </button>
          </div>

          {/* Avatar row */}
          <div className="relative px-5 -mt-8 mb-2">
            <div className="group relative size-16">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="relative size-16 overflow-hidden rounded-full ring-2 ring-card bg-muted transition-all block"
              >
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={displayNameFallback} width={64} height={64} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground">
                    {(displayNameFallback || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </button>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-4 text-white" strokeWidth={1.5} />
              </div>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-destructive text-white"
                >
                  <X className="size-2.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-5 pb-5">
            {/* Banner editor */}
            {bannerTab && (
              <div className="mb-4 space-y-3 rounded-xl border border-border bg-background p-4">
                <div className="relative h-16 overflow-hidden rounded-lg" style={bannerStyle(bannerDraft)}>
                  {bannerDraft?.type === 'emoji' && bannerDraft.emoji && (
                    <BannerEmojiPattern emoji={bannerDraft.emoji} opacity={bannerDraft.emojiOpacity ?? 50} />
                  )}
                </div>
                <BannerEditor value={bannerDraft} onChange={setBannerDraft} />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setBannerTab(false)}
                    className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted/40 transition-all">
                    Отмена
                  </button>
                  <button type="button" onClick={saveBanner} disabled={savingBanner}
                    className="flex-1 rounded-xl bg-[--accent-brand] py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50 transition-all">
                    {savingBanner ? t('profileSettings.saving') : t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {/* Profile form */}
            <DialogTitle className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight mb-4">
              {t("profileSettings.title")}
            </DialogTitle>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('profile.displayName')}
                </Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder={t('profile.displayNamePlaceholder')} maxLength={50}
                  className="h-10 rounded-xl border-border bg-background focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('profile.username')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <Input value={username} onChange={e => setUsername(e.target.value)}
                    placeholder={t('profile.usernamePlaceholder')} maxLength={20}
                    className="h-10 rounded-xl border-border bg-background pl-7 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("profileSettings.birthDate")}
                </Label>
                <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-10 rounded-xl border-border bg-background focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
                {birthDate && (
                  <p className="text-xs text-muted-foreground">
                    {Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} лет
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('profile.bio')}
                </Label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  placeholder={t('profile.bioPlaceholder')} maxLength={500} rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20" />
                <p className="text-right text-xs text-muted-foreground">{bio.length}/500</p>
              </div>

              {saveError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</p>
              )}

              <button type="submit" disabled={saving}
                className={cn(
                  'btn-accent h-10 w-full rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97]',
                  saveOk && 'bg-green-500 text-white',
                )}>
                {saving ? t('common.saving') : saveOk ? '✓ ' + t('common.save') : t('common.save')}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar crop dialog */}
      <Dialog open={!!cropSrc} onOpenChange={() => setCropSrc(null)}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card p-6">
          <DialogTitle className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight mb-4">
            {t("profileSettings.cropAvatar")}
          </DialogTitle>
          {cropSrc && (
            <ImageCropper src={cropSrc} aspect={1} outputSize={400} onConfirm={handleAvatarCrop} onCancel={() => setCropSrc(null)} />
          )}
        </DialogContent>
      </Dialog>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
    </>
  )
}
