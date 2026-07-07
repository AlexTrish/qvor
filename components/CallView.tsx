'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming, Minimize2, Maximize2, Monitor, MonitorOff } from 'lucide-react'
import type { CallState, IncomingCall } from '@/hooks/useWebRTC'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

// ─── Входящий звонок ──────────────────────────────────────────────────────────

export function IncomingCallModal({ call, onAccept, onReject }: {
  call: IncomingCall
  onAccept: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const name = call.fromName || '?'
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <div className="relative">
            <div className="size-20 overflow-hidden rounded-full bg-muted ring-4 ring-[--accent-brand]/30">
              {call.fromAvatar
                ? <Image src={call.fromAvatar} alt={name} width={80} height={80} className="size-full object-cover" />
                : <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground">{name.charAt(0).toUpperCase()}</div>
              }
            </div>
            <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[--accent-brand]">
              {call.video
                ? <Video className="size-3.5 text-black" strokeWidth={2} />
                : <Phone className="size-3.5 text-black" strokeWidth={2} />
              }
            </span>
          </div>
          <div className="text-center">
            <p className="font-[family-name:var(--font-syne)] text-xl font-black tracking-tight">{name}</p>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <PhoneIncoming className="size-3.5 text-[--accent-brand] animate-pulse" strokeWidth={2} />
              <p className="text-sm text-muted-foreground">{call.video ? t('call.video') : t('call.audio')}</p>
            </div>
          </div>
          <div className="flex items-center gap-8 pt-2">
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={onReject}
                className="flex size-16 items-center justify-center rounded-full bg-destructive text-white transition-all hover:brightness-110 active:scale-95">
                <PhoneOff className="size-6" strokeWidth={2} />
              </button>
              <span className="text-xs text-muted-foreground">{t('call.decline')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={onAccept}
                className="flex size-16 items-center justify-center rounded-full bg-green-500 text-white transition-all hover:brightness-110 active:scale-95">
                <Phone className="size-6" strokeWidth={2} />
              </button>
              <span className="text-xs text-muted-foreground">{t('call.accept')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Активный звонок ──────────────────────────────────────────────────────────

type ActiveCallProps = {
  callState: CallState
  peerName: string
  peerAvatar: string | null
  myAvatar: string | null
  myName: string
  isVideoEnabled: boolean
  isAudioMuted: boolean
  isCameraOff: boolean
  isSharingScreen: boolean
  isPeerMuted: boolean
  isSpeaking: boolean
  isPeerSpeaking: boolean
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  onEnd: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
  onEnableVideo: () => void
  onShareScreen: () => void
}

export function ActiveCallView({
  callState, peerName, peerAvatar, myAvatar, myName,
  isVideoEnabled, isAudioMuted, isCameraOff, isSharingScreen,
  isPeerMuted, isSpeaking, isPeerSpeaking,
  localVideoRef, remoteVideoRef,
  onEnd, onToggleMute, onToggleCamera, onEnableVideo, onShareScreen,
}: ActiveCallProps) {
  const { t } = useTranslation()
  const durationRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationElRef = useRef<HTMLSpanElement | null>(null)
  const [minimized, setMinimized] = useState(false)

  const peer = peerName || '?'
  const me = myName || '?'

  useEffect(() => {
    if (callState !== 'connected') return
    durationRef.current = 0
    timerRef.current = setInterval(() => {
      durationRef.current++
      if (durationElRef.current) {
        const m = Math.floor(durationRef.current / 60).toString().padStart(2, '0')
        const s = (durationRef.current % 60).toString().padStart(2, '0')
        durationElRef.current.textContent = `${m}:${s}`
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callState])

  if (callState === 'idle') return null

  // ── Свёрнутый режим — плавающий пип ──
  if (minimized) {
    return (
      <div className="fixed bottom-24 right-4 z-[300] flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl px-3 py-2 backdrop-blur-sm">
          <div className="size-9 shrink-0 overflow-hidden rounded-full bg-zinc-700">
            {peerAvatar
              ? <Image src={peerAvatar} alt={peer} width={36} height={36} className="size-full object-cover" />
              : <div className="flex size-full items-center justify-center text-sm font-bold text-zinc-300">{peer.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate max-w-[80px]">{peer}</p>
            <p className="text-[10px] text-white/60">
              {callState === 'connected' ? <span ref={durationElRef}>00:00</span> : t('call.connecting')}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <button type="button" onClick={onToggleMute}
              className={cn('flex size-7 items-center justify-center rounded-full transition-all', isAudioMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30')}>
              {isAudioMuted ? <MicOff className="size-3.5" strokeWidth={2} /> : <Mic className="size-3.5" strokeWidth={2} />}
            </button>
            <button type="button" onClick={onEnd}
              className="flex size-7 items-center justify-center rounded-full bg-destructive text-white transition-all hover:brightness-110">
              <PhoneOff className="size-3.5" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => setMinimized(false)}
              className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all">
              <Maximize2 className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Полноэкранный режим ──
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      {/* Remote video / avatar */}
      <div className="relative flex-1 overflow-hidden">
        {isVideoEnabled ? (
          <video
            ref={remoteVideoRef as React.RefObject<HTMLVideoElement>}
            autoPlay playsInline
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 to-black">
            {/* Аватарка собеседника по центру */}
            <div className="relative">
              <div className={cn(
                'size-32 overflow-hidden rounded-full bg-zinc-800 transition-all duration-200',
                isPeerSpeaking && !isPeerMuted ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-black' : 'ring-4 ring-white/10',
              )}>
                {peerAvatar
                  ? <Image src={peerAvatar} alt={peer} width={128} height={128} className="size-full object-cover" />
                  : <div className="flex size-full items-center justify-center text-5xl font-bold text-zinc-400">{peer.charAt(0).toUpperCase()}</div>
                }
              </div>
              {isPeerMuted && (
                <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-destructive border-2 border-black">
                  <MicOff className="size-4 text-white" strokeWidth={2} />
                </div>
              )}
            </div>
            <p className="font-[family-name:var(--font-syne)] text-2xl font-black text-white drop-shadow">{peer}</p>
          </div>
        )}

        {/* Status + кнопка свернуть */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between px-4 pt-safe pt-4">
          {isVideoEnabled && (
            <p className="font-[family-name:var(--font-syne)] text-lg font-black text-white drop-shadow">{peer}</p>
          )}
          <div className={cn('rounded-full bg-black/40 px-4 py-1 backdrop-blur-sm', !isVideoEnabled && 'mx-auto')}>
            <span className="text-sm font-medium text-white/90">
              {callState === 'calling' && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-yellow-400 animate-pulse" />{t("call.connecting")}</span>}
              {callState === 'connecting' && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-yellow-400 animate-pulse" />{t("call.ringing")}</span>}
              {callState === 'incoming' && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[--accent-brand] animate-pulse" />{t("call.incoming")}</span>}
              {callState === 'connected' && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-400" /><span ref={durationElRef}>00:00</span></span>}
              {callState === 'ended' && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-destructive" />{t("call.ended")}</span>}
            </span>
          </div>
          <button type="button" onClick={() => setMinimized(true)}
            className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all">
            <Minimize2 className="size-4" strokeWidth={2} />
          </button>
        </div>

        {/* Моя аватарка / локальное видео (PiP) */}
        <div className="absolute bottom-4 right-4">
          {isVideoEnabled ? (
            <div className={cn(
              'size-28 overflow-hidden rounded-2xl border-2 bg-zinc-900 shadow-xl transition-all duration-200',
              isSpeaking && !isAudioMuted ? 'border-green-400' : 'border-white/20',
            )}>
              <video ref={localVideoRef as React.RefObject<HTMLVideoElement>} autoPlay playsInline muted className="size-full object-cover" />
            </div>
          ) : (
            <div className={cn(
              'size-16 overflow-hidden rounded-full border-2 bg-zinc-800 shadow-xl transition-all duration-200',
              isSpeaking && !isAudioMuted ? 'border-green-400' : 'border-white/20',
            )}>
              {myAvatar
                ? <Image src={myAvatar} alt={me} width={64} height={64} className="size-full object-cover" />
                : <div className="flex size-full items-center justify-center text-xl font-bold text-zinc-400">{me.charAt(0).toUpperCase()}</div>
              }
            </div>
          )}
          {isAudioMuted && (
            <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive border border-black">
              <MicOff className="size-3 text-white" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 bg-black/80 px-6 py-8 backdrop-blur-sm pb-safe">
        <button type="button" onClick={onToggleMute}
          className={cn('flex size-14 items-center justify-center rounded-full transition-all active:scale-95', isAudioMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30')}>
          {isAudioMuted ? <MicOff className="size-6" strokeWidth={2} /> : <Mic className="size-6" strokeWidth={2} />}
        </button>

        <button type="button" onClick={onShareScreen}
          className={cn('flex size-14 items-center justify-center rounded-full transition-all active:scale-95', isSharingScreen ? 'bg-[--accent-brand] text-black' : 'bg-white/20 text-white hover:bg-white/30')}
          title={isSharingScreen ? 'Остановить демонстрацию' : 'Демонстрация экрана'}>
          {isSharingScreen ? <MonitorOff className="size-6" strokeWidth={2} /> : <Monitor className="size-6" strokeWidth={2} />}
        </button>

        <button type="button" onClick={onEnd}
          className="flex size-16 items-center justify-center rounded-full bg-destructive text-white transition-all hover:brightness-110 active:scale-95">
          <PhoneOff className="size-7" strokeWidth={2} />
        </button>

        {isVideoEnabled ? (
          <button type="button" onClick={onToggleCamera}
            className={cn('flex size-14 items-center justify-center rounded-full transition-all active:scale-95', isCameraOff ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30')}>
            {isCameraOff ? <VideoOff className="size-6" strokeWidth={2} /> : <Video className="size-6" strokeWidth={2} />}
          </button>
        ) : (
          <button type="button" onClick={onEnableVideo}
            className="flex size-14 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all active:scale-95"
            title="Включить видео">
            <Video className="size-6" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
