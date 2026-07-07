'use client'

import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />
}

export function ConversationSkeleton() {
  return (
    <div className="px-2 py-1 space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <Skeleton className="size-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="px-3 py-2 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => {
        const isOwn = i % 3 === 0
        return (
          <div key={i} className={cn('flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}>
            {!isOwn && <Skeleton className="size-6 rounded-full shrink-0" />}
            <Skeleton className={cn('h-10 rounded-[20px]', i % 2 === 0 ? 'w-48' : 'w-32')} />
          </div>
        )
      })}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="px-5 pb-4 pt-0">
          <div className="-mt-10 mb-3">
            <Skeleton className="size-20 rounded-full border-4 border-card" />
          </div>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-3.5 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-sm" />
        ))}
      </div>
    </div>
  )
}

export function ChannelSkeleton() {
  return (
    <div className="px-2 py-2 space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <Skeleton className="size-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
