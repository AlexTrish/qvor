'use client'

import { useRef, useState } from 'react'
import { Paperclip, X, Image as ImageIcon, FileText, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UploadedMedia = {
  url: string
  mediaType: 'image' | 'video' | 'file'
  mediaName: string
  mediaSize: number
  previewUrl?: string
}

type Props = {
  onUpload: (media: UploadedMedia) => void
  onClear: () => void
  current: UploadedMedia | null
  disabled?: boolean
}

export function MediaUploadButton({ onUpload, onClear, current, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Ошибка загрузки')

      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      onUpload({ ...json.data, previewUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setUploading(false)
    }
  }

  if (current) {
    return (
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {current.mediaType === 'image' && current.previewUrl ? (
            <img src={current.previewUrl} alt="" className="size-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              {current.mediaType === 'image' && <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.5} />}
              {current.mediaType === 'video' && <Video className="size-4 text-muted-foreground" strokeWidth={1.5} />}
              {current.mediaType === 'file' && <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{current.mediaName}</p>
            <p className="text-[10px] text-muted-foreground">
              {current.mediaSize < 1024 * 1024
                ? `${(current.mediaSize / 1024).toFixed(1)} KB`
                : `${(current.mediaSize / 1024 / 1024).toFixed(1)} MB`}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClear}
          className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors">
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-all',
          uploading
            ? 'text-[--accent-brand]'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )}
        title="Прикрепить файл"
      >
        {uploading
          ? <div className="size-4 animate-spin rounded-full border-2 border-[--accent-brand] border-t-transparent" />
          : <Paperclip className="size-4" strokeWidth={1.5} />
        }
      </button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip"
        onChange={handleFile}
      />
    </>
  )
}
