'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react'
import { compressPhoto } from '@/lib/utils/image'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

type StoryItem = {
  id: string
  dataUrl: string
  caption: string | null
  createdAt: string
  expiresAt: string
  viewed: boolean
  viewCount: number
}

type StoryGroup = {
  user: { id: string; numericId: number; username?: string | null; displayName?: string | null; avatarUrl?: string | null }
  stories: StoryItem[]
  hasUnviewed: boolean
}

// ─── Story Viewer ─────────────────────────────────────────────────────────────

function StoryViewer({
  groups, startGroupIndex, onClose,
}: {
  groups: StoryGroup[]
  startGroupIndex: number
  onClose: () => void
}) {
  const { user: currentUser } = useAuth()
  const [groupIdx, setGroupIdx] = useState(startGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const DURATION = 5000 // 5s per story

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]
  const isOwn = group?.user.id === currentUser?.id

  const markViewed = useCallback(async (id: string) => {
    await fetch(`/api/stories/${id}/view`, { method: 'POST' }).catch(() => null)
  }, [])

  const next = useCallback(() => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1)
      setProgress(0)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1)
      setStoryIdx(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [storyIdx, groupIdx, group, groups, onClose])

  const prev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(i => i - 1); setProgress(0) }
    else if (groupIdx > 0) { setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0) }
  }, [storyIdx, groupIdx])

  useEffect(() => {
    if (!story) return
    if (!story.viewed && !isOwn) markViewed(story.id)
    setProgress(0)
    if (timerRef.current) clearInterval(timerRef.current)
    const step = 100 / (DURATION / 100)
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current!); next(); return 0 }
        return p + step
      })
    }, 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [story?.id, groupIdx, storyIdx])

  async function deleteStory() {
    if (!story) return
    await fetch(`/api/stories/${story.id}`, { method: 'DELETE' })
    onClose()
  }

  if (!group || !story) return null

  const displayName = group.user.displayName || group.user.username || `User ${group.user.numericId}`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black" onClick={onClose}>
      <div className="relative h-full w-full max-w-sm mx-auto" onClick={e => e.stopPropagation()}>

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-none"
                style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-4">
          <div className="size-9 overflow-hidden rounded-full border-2 border-white shrink-0">
            {group.user.avatarUrl
              ? <Image src={group.user.avatarUrl} alt={displayName} width={36} height={36} className="size-full object-cover" />
              : <div className="flex size-full items-center justify-center bg-muted text-xs font-bold">{(displayName || "?").charAt(0).toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-white/70">
              {new Date(story.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {isOwn && (
            <div className="flex items-center gap-1 text-white/70 text-xs">
              <Eye className="size-3.5" strokeWidth={1.5} />
              <span>{story.viewCount}</span>
            </div>
          )}
          {isOwn && (
            <button type="button" onClick={deleteStory}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
              <Trash2 className="size-4" strokeWidth={1.5} />
            </button>
          )}
          <button type="button" onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Image */}
        <div className="relative h-full w-full">
          <Image src={story.dataUrl} alt={story.caption || 'story'} fill className="object-contain" />
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-12">
            <p className="text-sm text-white leading-relaxed">{story.caption}</p>
          </div>
        )}

        {/* Tap zones */}
        <button type="button" onClick={prev}
          className="absolute left-0 top-0 h-full w-1/3 z-20" aria-label="Previous" />
        <button type="button" onClick={next}
          className="absolute right-0 top-0 h-full w-1/3 z-20" aria-label="Next" />

        {/* Arrow hints */}
        {groupIdx > 0 && (
          <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 z-30">
            <ChevronLeft className="size-6 text-white/50" strokeWidth={2} />
          </div>
        )}
        {groupIdx < groups.length - 1 && (
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-30">
            <ChevronRight className="size-6 text-white/50" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create Story Modal ───────────────────────────────────────────────────────

function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCreate() {
    if (!preview) return
    setSaving(true)
    try {
      // Compress to max 1080px for stories
      const compressed = await compressPhoto(preview, 1080)
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressed, caption: caption.trim() || undefined }),
      })
      if (res.ok) { onCreated(); onClose() }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl sm:rounded-2xl border border-border bg-background shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-[family-name:var(--font-syne)] text-base font-bold">$1{t("$2")}$3</h2>
          <button type="button" onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!preview ? (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-[--accent-brand]/50 hover:bg-[--accent-brand-muted]">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Plus className="size-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground">$1{t("$2")}$3</p>
            </button>
          ) : (
            <div className="relative">
              <div className="relative aspect-[9/16] max-h-64 w-full overflow-hidden rounded-2xl bg-black">
                <Image src={preview} alt="preview" fill className="object-contain" />
              </div>
              <button type="button" onClick={() => setPreview(null)}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {preview && (
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Подпись к истории..." maxLength={200} rows={2}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20" />
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
              {t("story.cancel")}
            </button>
            <button type="button" onClick={handleCreate} disabled={!preview || saving}
              className="flex-1 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition-all">
              {saving ? t('story.publishing') : t('story.publish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main StoriesBar ──────────────────────────────────────────────────────────

export function StoriesBar() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerGroup, setViewerGroup] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stories')
      const json = await res.json()
      setGroups(json.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const ownGroup = groups.find(g => g.user.id === user?.id)
  const displayName = user?.displayName || user?.username || `User ${user?.numericId}`

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="size-14 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none border-b border-border/60">

        {/* Add story button */}
        <button type="button" onClick={() => setCreateOpen(true)}
          className="flex shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <div className="relative">
            <div className="size-14 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
              {user?.avatarUrl
                ? <Image src={user.avatarUrl} alt={displayName} width={56} height={56} className="size-full object-cover" />
                : <div className="flex size-full items-center justify-center text-lg font-bold text-muted-foreground">{(displayName || "?").charAt(0).toUpperCase()}</div>
              }
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[--accent-brand] border-2 border-background">
              <Plus className="size-3 text-black" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground max-w-[56px] truncate text-center">
            {ownGroup ? t("story.my") : t("story.add")}
          </span>
        </button>

        {/* Story groups */}
        {groups.map((group, idx) => {
          const name = group.user.displayName || group.user.username || `User ${group.user.numericId}`
          const isOwn = group.user.id === user?.id
          return (
            <button key={group.user.id} type="button"
              onClick={() => setViewerGroup(idx)}
              className="flex shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div className={cn(
                'size-14 overflow-hidden rounded-full p-0.5',
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-[--accent-brand] to-orange-300'
                  : 'bg-muted',
              )}>
                <div className="size-full overflow-hidden rounded-full border-2 border-background bg-muted">
                  {group.user.avatarUrl
                    ? <Image src={group.user.avatarUrl} alt={name} width={52} height={52} className="size-full object-cover" />
                    : <div className="flex size-full items-center justify-center text-base font-bold text-muted-foreground">{(name || "?").charAt(0).toUpperCase()}</div>
                  }
                </div>
              </div>
              <span className="text-[10px] font-medium text-foreground max-w-[56px] truncate text-center">
                {isOwn ? t("story.my") : name}
              </span>
            </button>
          )
        })}
      </div>

      {viewerGroup !== null && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerGroup}
          onClose={() => { setViewerGroup(null); load() }}
        />
      )}

      {createOpen && (
        <CreateStoryModal
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}
    </>
  )
}
