'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroupParticipant } from '@/hooks/useGroupCall'
import { useTranslation } from '@/hooks/useTranslation'

function ParticipantTile({ p, isLocal }: { p: GroupParticipant; isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && p.stream) {
      videoRef.current.srcObject = p.stream
    }
  }, [p.stream])

  const name = p.name || '?'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center aspect-video">
      {p.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {p.avatar
            ? <Image src={p.avatar} alt={name} width={64} height={64} className="size-16 rounded-full object-cover" />
            : <div className="flex size-16 items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold text-zinc-300">{name.charAt(0).toUpperCase()}</div>
          }
          <p className="text-sm font-medium text-white/80">{name}</p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 backdrop-blur-sm">
        {p.isMuted && <MicOff className="size-3 text-destructive" strokeWidth={2} />}
        <span className="text-[11px] font-medium text-white">{isLocal ? 'Вы' : name}</span>
      </div>
    </div>
  )
}

type Props = {
  channelName: string
  participants: GroupParticipant[]
  localParticipant: GroupParticipant
  isAudioMuted: boolean
  isVideoEnabled: boolean
  localStreamRef: React.RefObject<MediaStream | null>
  onLeave: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
}

export function GroupCallView({
  channelName, participants, localParticipant,
  isAudioMuted, isVideoEnabled, localStreamRef,
  onLeave, onToggleMute, onToggleCamera,
}: Props) {
  const { t } = useTranslation()
  const localVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [localStreamRef])

  const allTiles = [
    { ...localParticipant, stream: localStreamRef.current, isLocal: true },
    ...participants.map(p => ({ ...p, isLocal: false })),
  ]

  // Сетка: 1 → 1 col, 2 → 2 col, 3-4 → 2 col, 5+ → 3 col
  const cols = allTiles.length === 1 ? 'grid-cols-1' : allTiles.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <div>
          <p className="text-sm font-semibold text-white">{channelName}</p>
          <p className="text-xs text-white/60">{allTiles.length} {t('channel.membersShort').replace('{count}', '').trim()}</p>
        </div>
      </div>

      {/* Grid */}
      <div className={cn('flex-1 grid gap-1 p-2 overflow-hidden', cols)}>
        {allTiles.map((tile, i) => (
          <div key={tile.userId} className="relative overflow-hidden rounded-2xl bg-zinc-900 flex items-center justify-center">
            {tile.isLocal && localStreamRef.current ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="size-full object-cover" />
            ) : tile.stream ? (
              <RemoteVideo stream={tile.stream} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                {tile.avatar
                  ? <Image src={tile.avatar} alt={tile.name} width={56} height={56} className="size-14 rounded-full object-cover" />
                  : <div className="flex size-14 items-center justify-center rounded-full bg-zinc-700 text-xl font-bold text-zinc-300">{(tile.name || '?').charAt(0).toUpperCase()}</div>
                }
                <p className="text-xs font-medium text-white/70">{tile.isLocal ? 'Вы' : tile.name}</p>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {tile.isLocal ? 'Вы' : tile.name}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 bg-black/80 px-6 py-6 pb-safe backdrop-blur-sm">
        <button type="button" onClick={onToggleMute}
          className={cn('flex size-14 items-center justify-center rounded-full transition-all active:scale-95', isAudioMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30')}>
          {isAudioMuted ? <MicOff className="size-6" strokeWidth={2} /> : <Mic className="size-6" strokeWidth={2} />}
        </button>
        <button type="button" onClick={onLeave}
          className="flex size-16 items-center justify-center rounded-full bg-destructive text-white transition-all hover:brightness-110 active:scale-95">
          <PhoneOff className="size-7" strokeWidth={2} />
        </button>
        <button type="button" onClick={onToggleCamera}
          className={cn('flex size-14 items-center justify-center rounded-full transition-all active:scale-95', !isVideoEnabled ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30')}>
          {isVideoEnabled ? <Video className="size-6" strokeWidth={2} /> : <VideoOff className="size-6" strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return <video ref={ref} autoPlay playsInline className="size-full object-cover" />
}
