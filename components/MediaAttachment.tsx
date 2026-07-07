'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Download, Play, File, FileSpreadsheet, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  type: string
  name?: string | null
  size?: number | null
  isOwn: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return <FileText className="size-5 text-red-500" strokeWidth={1.5} />
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className="size-5 text-green-600" strokeWidth={1.5} />
  if (['zip', 'rar', '7z'].includes(ext)) return <Archive className="size-5 text-yellow-500" strokeWidth={1.5} />
  return <File className="size-5 text-muted-foreground" strokeWidth={1.5} />
}

export function MediaAttachment({ url, type, name, size, isOwn }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const [videoError, setVideoError] = useState(false)

  if (type === 'image') {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block overflow-hidden rounded-xl max-w-[260px] cursor-zoom-in"
        >
          <img
            src={url}
            alt={name ?? 'image'}
            className="w-full h-auto object-cover max-h-[300px] rounded-xl hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </button>

        {lightbox && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            <img
              src={url}
              alt={name ?? 'image'}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <a
              href={url}
              download={name ?? 'image'}
              className="absolute bottom-6 right-6 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-all"
              onClick={e => e.stopPropagation()}
            >
              <Download className="size-4" strokeWidth={1.5} />
              Скачать
            </a>
          </div>
        )}
      </>
    )
  }

  if (type === 'video') {
    return (
      <div className="overflow-hidden rounded-xl max-w-[280px]">
        {videoError ? (
          <a href={url} download={name ?? 'video'}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5',
              isOwn ? 'border-background/20 bg-background/10' : 'border-border bg-muted/30',
            )}>
            <Play className="size-5 text-[--accent-brand]" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{name ?? 'video'}</p>
              {size && <p className="text-[10px] text-muted-foreground">{formatSize(size)}</p>}
            </div>
            <Download className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          </a>
        ) : (
          <video
            src={url}
            controls
            className="w-full rounded-xl max-h-[300px]"
            onError={() => setVideoError(true)}
          />
        )}
      </div>
    )
  }

  // file
  return (
    <a
      href={url}
      download={name ?? 'file'}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:opacity-80 max-w-[260px]',
        isOwn ? 'border-background/20 bg-background/10' : 'border-border bg-muted/30',
      )}
    >
      <div className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl',
        isOwn ? 'bg-background/20' : 'bg-muted',
      )}>
        <FileIcon name={name ?? 'file'} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-xs font-medium', isOwn ? 'text-background/90' : '')}>{name ?? 'Файл'}</p>
        {size && <p className={cn('text-[10px]', isOwn ? 'text-background/50' : 'text-muted-foreground')}>{formatSize(size)}</p>}
      </div>
      <Download className={cn('size-4 shrink-0', isOwn ? 'text-background/60' : 'text-muted-foreground')} strokeWidth={1.5} />
    </a>
  )
}
