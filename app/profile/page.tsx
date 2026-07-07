'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { AppNav } from '@/components/AppNav'
import { BannerEmojiPattern, bannerStyle, type BannerConfig } from '@/components/BannerEditor'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { compressAvatar, compressPhoto } from '@/lib/utils/image'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Grid3X3, LayoutList, Plus, Settings, Trash2 } from 'lucide-react'
import { ProfileSkeleton } from '@/components/Skeletons'
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal'
import { FollowersModal } from '@/components/FollowersModal'

type Photo = { id: string; dataUrl: string; caption: string; createdAt: string }
type ViewMode = 'grid' | 'feed'
const PAGE_SIZE = 9

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const photoFileRef = useRef<HTMLInputElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [followersOpen, setFollowersOpen] = useState(false)
  const [followersTab, setFollowersTab] = useState<'followers' | 'following'>('followers')
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })
  // Add photo state
  const [addPhotoSrc, setAddPhotoSrc] = useState<string | null>(null)
  const [addPhotoCaption, setAddPhotoCaption] = useState('')
  const [addPhotoSaving, setAddPhotoSaving] = useState(false)
  const allPhotosRef = useRef<Photo[]>([])

  useEffect(() => {
    if (!user) return
    loadPhotos()
    // Load follow stats
    fetch(`/api/users/${user.id}/follow`)
      .then(r => r.json())
      .then(d => { if (d.data) setFollowStats({ followersCount: d.data.followersCount, followingCount: d.data.followingCount }) })
      .catch(() => null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadPhotos() {
    if (!user) return
    setPhotosLoading(true)
    try {
      const res = await fetch(`/api/photos?userId=${user.id}`)
      const json = await res.json()
      const all: Photo[] = json.data ?? []
      allPhotosRef.current = all
      setPhotos(all.slice(0, PAGE_SIZE))
      setPage(1)
      setHasMore(all.length > PAGE_SIZE)
    } catch {} finally { setPhotosLoading(false) }
  }

  const loadMore = useCallback(() => {
    const all = allPhotosRef.current
    const next = page + 1
    setPhotos(all.slice(0, next * PAGE_SIZE))
    setPage(next)
    setHasMore(next * PAGE_SIZE < all.length)
  }, [page])

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) loadMore() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  if (!user) return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex-1 overflow-y-auto"><ProfileSkeleton /></div>
    </div>
  )

  const displayName = user.displayName || user.username || `User ${user.numericId}`
  const initials = (displayName || "?").charAt(0).toUpperCase()
  const currentBanner: BannerConfig | null = user.bannerConfig ? JSON.parse(user.bannerConfig) : null

  // Photo upload (no crop)
  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => { setAddPhotoSrc(ev.target?.result as string); setAddPhotoCaption('') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleAddPhoto() {
    if (!addPhotoSrc) return
    setAddPhotoSaving(true)
    try {
      const compressed = await compressPhoto(addPhotoSrc, 1200)
      const res = await fetch('/api/photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressed, caption: addPhotoCaption.trim() }),
      })
      const json = await res.json()
      if (json.data) {
        allPhotosRef.current = [json.data, ...allPhotosRef.current]
        setPhotos(prev => [json.data, ...prev])
      }
      setAddPhotoSrc(null); setAddPhotoCaption('')
    } finally { setAddPhotoSaving(false) }
  }

  async function saveBanner() {
    await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bannerConfig: null }) })
    await refreshUser()
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    allPhotosRef.current = allPhotosRef.current.filter(p => p.id !== id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    setSelectedPhoto(null)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />

      <div className="flex-1 overflow-y-auto mobile-pb">

        <div className="mx-auto max-w-xl px-4 pt-4">

          {/* Profile card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mb-6">
            <div className="relative h-32 w-full" style={bannerStyle(currentBanner)}>
              {currentBanner?.type === 'emoji' && currentBanner.emoji && (
                <BannerEmojiPattern emoji={currentBanner.emoji} opacity={currentBanner.emojiOpacity ?? 50} />
              )}
              <button type="button" onClick={() => setProfileSettingsOpen(true)}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/50">
                <Settings className="size-3" strokeWidth={1.5} />Настройки
              </button>
            </div>

            <div className="relative px-5 pb-4 pt-0">
              <div className="flex items-end justify-between -mt-10">
                <div className="relative shrink-0">
                  <div className="group relative size-20">
                    <button type="button" onClick={() => setProfileSettingsOpen(true)}
                      className="relative size-20 overflow-hidden rounded-full ring-2 ring-card bg-muted transition-all block">
                      {user.avatarUrl
                        ? <Image src={user.avatarUrl} alt={displayName} width={80} height={80} className="size-full object-cover" />
                        : <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground">{initials}</div>
                      }
                      {uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full"><div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="size-4 text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                  <span className={['absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card', user.isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'].join(' ')}>
                    {user.isOnline && <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60" />}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-[family-name:var(--font-syne)] text-xl font-black tracking-tight truncate">{displayName}</h1>
                  {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground pt-1">#{user.numericId}</span>
              </div>

              {/* Follow stats */}
              <div className="mt-3 flex items-center gap-4">
                <button type="button" onClick={() => { setFollowersTab('followers'); setFollowersOpen(true) }}
                  className="text-left transition-colors hover:text-[--accent-brand]">
                  <span className="text-sm font-bold">{followStats.followersCount}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t('profile.followers')}</span>
                </button>
                <button type="button" onClick={() => { setFollowersTab('following'); setFollowersOpen(true) }}
                  className="text-left transition-colors hover:text-[--accent-brand]">
                  <span className="text-sm font-bold">{followStats.followingCount}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t('profile.following')}</span>
                </button>
              </div>

              {user.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border pt-3">{user.bio}</p>}
            </div>
          </div>

          {/* Wall header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t('profile.photos')}</h2>
              <span className="text-xs text-muted-foreground">{allPhotosRef.current.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => photoFileRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:border-[--accent-brand]/40 hover:bg-[--accent-brand-muted] hover:text-[--accent-brand]">
                <Plus className="size-3" strokeWidth={2} />Добавить
              </button>
              <div className="flex rounded-lg border border-border bg-card overflow-hidden">
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`flex size-8 items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Grid3X3 className="size-3.5" strokeWidth={1.5} />
                </button>
                <button type="button" onClick={() => setViewMode('feed')}
                  className={`flex size-8 items-center justify-center transition-colors ${viewMode === 'feed' ? 'bg-[--accent-brand-muted] text-[--accent-brand]' : 'text-muted-foreground hover:text-foreground'}`}>
                  <LayoutList className="size-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Wall */}
          {photosLoading ? (
            <div className="grid grid-cols-3 gap-0.5 mb-8">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square animate-pulse bg-muted" />)}
            </div>
          ) : photos.length === 0 ? (
            <div className="mb-8 flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Camera className="size-7 text-muted-foreground" strokeWidth={1} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('profile.noPhotos')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            // ─── Instagram-style grid ───────────────────────────────────────
            <div className="grid grid-cols-3 gap-0.5 mb-8 overflow-hidden rounded-xl">
              {photos.map((photo, idx) => (
                <button key={photo.id} type="button" onClick={() => setSelectedPhoto(photo)}
                  className="group relative overflow-hidden bg-muted"
                  style={{ aspectRatio: '1' }}>
                  <Image
                    src={photo.dataUrl}
                    alt={photo.caption || 'photo'}
                    fill
                    sizes="(max-width: 640px) 33vw, 200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    {photo.caption && (
                      <p className="line-clamp-2 px-2 text-center text-[11px] font-medium text-white drop-shadow">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                  {/* First photo badge */}
                  {idx === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                      NEW
                    </span>
                  )}
                </button>
              ))}
              {hasMore && <div ref={loaderRef} className="col-span-3 h-4" />}
            </div>
          ) : (
            // ─── Instagram-style feed ───────────────────────────────────────
            <div className="space-y-4 mb-8">
              {photos.map(photo => (
                <div key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  {/* Image */}
                  <button type="button" onClick={() => setSelectedPhoto(photo)} className="relative block w-full">
                    <div className="relative w-full overflow-hidden" style={{ maxHeight: '480px' }}>
                      <Image
                        src={photo.dataUrl}
                        alt={photo.caption || 'photo'}
                        width={800}
                        height={600}
                        className="w-full h-auto object-cover"
                        style={{ maxHeight: '480px', objectFit: 'cover' }}
                      />
                    </div>
                  </button>
                  {/* Footer */}
                  <div className="px-4 py-3">
                    {photo.caption && (
                      <p className="mb-2 text-sm leading-relaxed">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: photo.caption.replace(
                              /(^|\s)(#[\w\u0400-\u04FF]{1,50})/g,
                              '$1<a href="/search?q=$2" class="md-hashtag">$2</a>'
                            )
                          }}
                        />
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(photo.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <button type="button" onClick={() => deletePhoto(photo.id)}
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {hasMore && <div ref={loaderRef} className="h-4" />}
            </div>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={photoFileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

      {/* Add photo dialog (no crop) */}
      <Dialog open={!!addPhotoSrc} onOpenChange={() => setAddPhotoSrc(null)}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card p-0 overflow-hidden">
          <DialogTitle className="font-[family-name:var(--font-syne)] px-5 pt-5 text-base font-bold tracking-tight">Добавить фото</DialogTitle>
          {addPhotoSrc && (
            <div className="p-5 space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted">
                <Image src={addPhotoSrc} alt="preview" width={400} height={300} className="w-full h-auto object-contain max-h-64" />
              </div>
              <Textarea value={addPhotoCaption} onChange={e => setAddPhotoCaption(e.target.value)}
                placeholder="Подпись к фото..." maxLength={500} rows={2}
                className="h-auto resize-none rounded-xl border-border bg-muted/30 px-3 py-2 focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setAddPhotoSrc(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">Отмена</button>
                <button type="button" onClick={handleAddPhoto} disabled={addPhotoSaving}
                  className="flex-1 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition-all">
                  {addPhotoSaving ? t("profile.uploading") : t("profile.publish")}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banner editor */}
      <ProfileSettingsModal open={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} />
      <FollowersModal open={followersOpen} onClose={() => setFollowersOpen(false)} userId={user.id} currentUserId={user.id} initialTab={followersTab} />

      {/* Photo viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-border bg-card p-0 overflow-hidden">
          <DialogTitle className="sr-only">Фото</DialogTitle>
          {selectedPhoto && (
            <>
              <div className="relative w-full bg-black">
                <Image
                  src={selectedPhoto.dataUrl}
                  alt={selectedPhoto.caption || 'photo'}
                  width={800} height={600}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '70vh' }}
                />
              </div>
              <div className="px-4 py-3">
                {selectedPhoto.caption && (
                  <p className="mb-2 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: selectedPhoto.caption.replace(
                        /(^|\s)(#[\w\u0400-\u04FF]{1,50})/g,
                        '$1<a href="/search?q=$2" class="md-hashtag">$2</a>'
                      )
                    }}
                  />
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedPhoto.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <button type="button" onClick={() => deletePhoto(selectedPhoto.id)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
