'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { AppNav } from '@/components/AppNav'
import { SettingsModal } from '@/components/SettingsModal'
import { BannerEmojiPattern, bannerStyle, type BannerConfig } from '@/components/BannerEditor'
import { ArrowLeft, MessageCircle, UserMinus, UserPlus, Grid3X3, LayoutList, Camera, MoreVertical, Flag, ShieldOff } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MarkdownText } from '@/components/MarkdownText'
import { cn } from '@/lib/utils'
import { FollowersModal } from '@/components/FollowersModal'
import { ReportModal } from '@/components/ReportModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatLastSeen(lastSeenAt: string | null | undefined, t: (k: string, v?: Record<string, string>) => string): string {
  if (!lastSeenAt) return t('profile.offline')
  const d = new Date(lastSeenAt)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return t('profile.justNow')
  if (mins < 60) return t('profile.minsAgo', { n: String(mins) })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('profile.hoursAgo', { n: String(hours) })
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
}

type UserProfile = {
  id: string
  numericId: number
  username?: string | null
  displayName?: string | null
  bio?: string | null
  avatarUrl?: string | null
  bannerConfig?: string | null
  isOnline: boolean
  lastSeenAt?: string | null
  createdAt: string
}

type Photo = { id: string; dataUrl: string; caption: string; createdAt: string }
type ViewMode = 'grid' | 'feed'
const PAGE_SIZE = 9

type Props = { lookup: string }

export function PublicProfile({ lookup }: Props) {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersModalOpen, setFollowersModalOpen] = useState(false)
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const allPhotosRef = useRef<Photo[]>([])
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(lookup)}`)
      .then(r => r.json())
      .then(d => { if (d.data) setProfile(d.data); else setError(true) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [lookup])

  useEffect(() => {
    if (!menuOpen) return
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  useEffect(() => {
    if (!profile?.id || !currentUser?.id) return
    fetch(`/api/users/${profile.id}/follow`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setIsFollowing(d.data.isFollowing)
          setFollowersCount(d.data.followersCount)
          setFollowingCount(d.data.followingCount ?? 0)
        }
      }).catch(() => null)
  }, [profile?.id, currentUser?.id])

  async function toggleFollow() {
    if (!profile) return
    setFollowLoading(true)
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const res = await fetch(`/api/users/${profile.id}/follow`, { method })
      if (res.ok) {
        setIsFollowing(v => !v)
        setFollowersCount(v => isFollowing ? v - 1 : v + 1)
      }
    } finally { setFollowLoading(false) }
  }

  useEffect(() => {
    if (!profile) return
    setPhotosLoading(true)
    fetch(`/api/photos?userId=${profile.id}`)
      .then(r => r.json())
      .then(d => {
        const all: Photo[] = d.data ?? []
        allPhotosRef.current = all
        setPhotos(all.slice(0, PAGE_SIZE))
        setPage(1)
        setHasMore(all.length > PAGE_SIZE)
      })
      .catch(() => {})
      .finally(() => setPhotosLoading(false))
  }, [profile?.id])

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

  if (loading) return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex flex-1 items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
      </div>
    </div>
  )

  if (error || !profile) return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('profile.notFound')}</p>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" strokeWidth={2} />{t('common.back')}
        </Link>
      </div>
    </div>
  )

  const isOwn = currentUser?.id === profile.id
  const displayName = profile.displayName || profile.username || `User ${profile.numericId}`
  const initials = (displayName || "?").charAt(0).toUpperCase()
  const banner: BannerConfig | null = profile.bannerConfig ? JSON.parse(profile.bannerConfig) : null

  async function toggleBlock() {
    const method = isBlocked ? 'DELETE' : 'POST'
    const res = await fetch(`/api/users/${profile!.id}/block`, { method })
    if (res.ok) setIsBlocked(v => !v)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />

      <div className="flex-1 overflow-y-auto mobile-pb">
        <div className="mx-auto max-w-xl px-4 pt-4">

          {/* Profile card — same as own profile */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mb-6">
            {/* Banner */}
            <div className="relative h-32 w-full" style={bannerStyle(banner)}>
              {banner?.type === 'emoji' && banner.emoji && (
                <BannerEmojiPattern emoji={banner.emoji} opacity={banner.emojiOpacity ?? 50} />
              )}
              {/* Back button */}
              <Link href="/"
                className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/50">
                <ArrowLeft className="size-3" strokeWidth={2} />{t('common.back')}
              </Link>
              {!isOwn && currentUser && (
                <div className="absolute right-3 top-3" ref={menuRef}>
                  <button type="button" onClick={() => setMenuOpen(v => !v)}
                    className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50">
                    <MoreVertical className="size-4" strokeWidth={1.5} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      <button type="button" onClick={() => { toggleBlock(); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 text-destructive">
                        <ShieldOff className="size-3.5" strokeWidth={1.5} />
              {isBlocked ? t('profile.unblock') : t('profile.block')}
                      </button>
                      <button type="button" onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 text-muted-foreground">
                        <Flag className="size-3.5" strokeWidth={1.5} />
                        {t("profile.report")}
                      </button>                    </div>
                  )}
                </div>
              )}
              {isOwn && (
                <div className="absolute right-3 top-3">
                  <SettingsModal />
                </div>
              )}
            </div>

            {/* Avatar + info */}
            <div className="relative px-5 pb-4 pt-0">
              <div className="flex items-end justify-between -mt-10">
                <div className="relative shrink-0">
                  <div className="size-20 overflow-hidden rounded-full bg-muted">
                    {profile.avatarUrl
                      ? <Image src={profile.avatarUrl} alt={displayName} width={80} height={80} className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground">{initials}</div>
                    }
                  </div>
                  <span className={[
                    'absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card',
                    profile.isOnline ? 'bg-green-500' : 'bg-muted-foreground/40',
                  ].join(' ')}>
                    {profile.isOnline && <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60" />}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-[family-name:var(--font-syne)] text-xl font-black tracking-tight truncate">{displayName}</h1>
                  {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
          {profile.isOnline ? t('profile.online') : formatLastSeen(profile.lastSeenAt, t)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground pt-1">#{profile.numericId}</span>
              </div>

              {profile.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border pt-3">{profile.bio}</p>}

              {/* Follow stats */}
              <div className="mt-3 flex items-center gap-4">
                <button type="button"
                  onClick={() => { setFollowersModalTab('followers'); setFollowersModalOpen(true) }}
                  className="text-left transition-colors hover:text-[--accent-brand]">
                  <span className="text-sm font-bold">{followersCount}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t('profile.followers')}</span>
                </button>
                <button type="button"
                  onClick={() => { setFollowersModalTab('following'); setFollowersModalOpen(true) }}
                  className="text-left transition-colors hover:text-[--accent-brand]">
                  <span className="text-sm font-bold">{followingCount}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t('profile.following')}</span>
                </button>
              </div>

              {/* Actions */}
              {currentUser && !isOwn && (
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <Link href={`/messages?id=${profile.id}`}
                    className="flex items-center gap-2 rounded-xl bg-[--accent-brand] px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110">
                    <MessageCircle className="size-3.5" strokeWidth={2} />{t('profile.message')}
                  </Link>
                  <button type="button" onClick={toggleFollow} disabled={followLoading}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50',
                      isFollowing
                        ? 'border-border bg-background hover:bg-muted/40'
                        : 'border-[--accent-brand]/40 bg-[--accent-brand-muted] text-[--accent-brand] hover:brightness-110',
                    )}>
                    {isFollowing ? <UserMinus className="size-3.5" strokeWidth={2} /> : <UserPlus className="size-3.5" strokeWidth={2} />}
                    {isFollowing ? t('profile.unfollow') : t('profile.follow')}
                  </button>

                </div>
              )}
              {/* Followers count убран — теперь в отдельном блоке выше */}
            </div>
          </div>

          {/* Photo wall */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold">{t('profile.photos')}</h2>
              <span className="text-xs text-muted-foreground">{allPhotosRef.current.length}</span>
            </div>
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

          {photosLoading ? (
            <div className="grid grid-cols-3 gap-0.5 mb-8">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse bg-muted" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="mb-8 flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <Camera className="size-7 text-muted-foreground" strokeWidth={1} />
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.noPhotos')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-0.5 mb-8 overflow-hidden rounded-xl">
              {photos.map(photo => (
                <button key={photo.id} type="button" onClick={() => setSelectedPhoto(photo)}
                  className="group relative overflow-hidden bg-muted" style={{ aspectRatio: '1' }}>
                  <Image src={photo.dataUrl} alt={photo.caption || 'photo'} fill
                    sizes="(max-width: 640px) 33vw, 200px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-end bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    {photo.caption && (
                      <p className="line-clamp-2 w-full px-2 pb-2 text-center text-[11px] font-medium text-white drop-shadow">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {hasMore && <div ref={loaderRef} className="col-span-3 h-4" />}
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {photos.map(photo => (
                <div key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <button type="button" onClick={() => setSelectedPhoto(photo)} className="relative block w-full">
                    <Image src={photo.dataUrl} alt={photo.caption || 'photo'} width={800} height={600}
                      className="w-full h-auto" />
                  </button>
                  {photo.caption && (
                    <p className="px-4 pt-3 pb-1 text-sm leading-relaxed">
                      <MarkdownText text={photo.caption} />
                    </p>
                  )}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      {new Date(photo.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
              {hasMore && <div ref={loaderRef} className="h-4" />}
            </div>
          )}

        </div>
      </div>

      {/* Photo viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-border bg-card p-0 overflow-hidden">
          <DialogTitle className="sr-only">Фото</DialogTitle>
          {selectedPhoto && (
            <>
              <div className="relative w-full bg-black">
                <Image src={selectedPhoto.dataUrl} alt={selectedPhoto.caption || 'photo'}
                  width={800} height={600} className="w-full h-auto object-contain" style={{ maxHeight: '70vh' }} />
              </div>
              {selectedPhoto.caption && (
                <p className="px-4 pt-3 pb-1 text-sm leading-relaxed">
                  <MarkdownText text={selectedPhoto.caption} />
                </p>
              )}
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedPhoto.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FollowersModal
        open={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userId={profile.id}
        currentUserId={currentUser?.id}
        initialTab={followersModalTab}
      />

      {reportOpen && profile && (
        <ReportModal
          targetType="user"
          targetId={profile.id}
          targetName={profile.displayName || profile.username || `User ${profile.numericId}`}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  )
}
