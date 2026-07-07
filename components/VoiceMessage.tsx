'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Lock, Trash2, Send, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sounds } from '@/lib/sounds'
import { useTranslation } from '@/hooks/useTranslation'

// ─── Хук записи голоса ────────────────────────────────────────────────────────

export type VoiceRecordState = 'idle' | 'recording' | 'locked' | 'preview'

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecordState>('idle')
  const [duration, setDuration] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [waveform, setWaveform] = useState<number[]>([])
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const waveDataRef = useRef<number[]>([])
  const mimeTypeRef = useRef('audio/webm')

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    cancelAnimationFrame(animFrameRef.current)
  }

  function startWaveform(stream: MediaStream) {
    try {
      const ac = new AudioContext()
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      function tick() {
        analyser.getByteFrequencyData(data)
        const vals = Array.from(data.slice(0, 20)).map(v => v / 255)
        waveDataRef.current = [...waveDataRef.current, ...vals].slice(-60)
        setWaveform([...waveDataRef.current])
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {}
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startWaveform(stream)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm'
      mimeTypeRef.current = mimeType

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        cancelAnimationFrame(animFrameRef.current)
        if (chunksRef.current.length > 0) {
          setBlob(new Blob(chunksRef.current, { type: mimeTypeRef.current }))
          setState('preview')
        } else {
          setState('idle')
        }
      }

      mr.start(100)
      durationRef.current = 0
      setDuration(0)
      setBlob(null)
      waveDataRef.current = []
      setWaveform([])
      setState('recording')
      sounds.voiceStart()

      timerRef.current = setInterval(() => {
        durationRef.current++
        setDuration(durationRef.current)
        if (durationRef.current >= 300) stop()
      }, 1000)
    } catch {
      setState('idle')
    }
  }

  function stop() {
    stopTimer()
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
  }

  function lock() { setState('locked') }

  function cancel() {
    stopTimer()
    if (mediaRef.current?.state === 'recording') {
      chunksRef.current = []
      mediaRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setBlob(null)
    setDuration(0)
    durationRef.current = 0
    waveDataRef.current = []
    setWaveform([])
    setState('idle')
    sounds.voiceCancel()
  }

  function reset() {
    setBlob(null)
    setDuration(0)
    durationRef.current = 0
    waveDataRef.current = []
    setWaveform([])
    setState('idle')
  }

  return { state, duration, blob, durationRef, waveform, start, stop, lock, cancel, reset }
}

// ─── Визуализация волны ───────────────────────────────────────────────────────

function Waveform({ data, isOwn, progress = 0, isStatic = false }: {
  data: number[]
  isOwn?: boolean
  progress?: number
  isStatic?: boolean
}) {
  const BARS = 40
  const bars = Array.from({ length: BARS }, (_, i) => {
    const v = data[Math.floor(i * data.length / BARS)] ?? 0
    return Math.max(0.06, v)
  })

  return (
    <div className="flex flex-1 items-center gap-px" style={{ height: 32 }}>
      {bars.map((v, i) => {
        const filled = isStatic ? (i / BARS <= progress) : true
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-full',
              isStatic
                ? filled
                  ? isOwn ? 'bg-background/70' : 'bg-[--accent-brand]'
                  : isOwn ? 'bg-background/25' : 'bg-[--accent-brand]/30'
                : 'bg-destructive/60',
            )}
            style={{ height: `${Math.round(v * 26 + 4)}px` }}
          />
        )
      })}
    </div>
  )
}

// ─── Кнопка микрофона (idle) ──────────────────────────────────────────────────

type VoiceMicButtonProps = {
  recorder: ReturnType<typeof useVoiceRecorder>
  onSend: (blob: Blob, duration: number) => Promise<void>
  disabled?: boolean
}

export function VoiceMicButton({ recorder, onSend, disabled }: VoiceMicButtonProps) {
  const { state, start } = recorder
  const startYRef = useRef<number>(0)
  const lockedRef = useRef(false)

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled || state !== 'idle') return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startYRef.current = e.clientY
    lockedRef.current = false
    start()
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (recorder.state !== 'recording') return
    const dy = startYRef.current - e.clientY
    if (dy > 60 && !lockedRef.current) {
      lockedRef.current = true
      recorder.lock()
    }
  }

  function handlePointerUp() {
    if (recorder.state === 'recording' && !lockedRef.current) {
      if (recorder.durationRef.current < 1) { recorder.cancel(); return }
      recorder.stop()
    }
  }

  if (state !== 'idle') return null

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 select-none touch-none"
    >
      <Mic className="size-4" strokeWidth={2} />
    </button>
  )
}

// ─── Панель записи (над полем ввода) ─────────────────────────────────────────

type VoiceRecordingBarProps = {
  recorder: ReturnType<typeof useVoiceRecorder>
  onSend: (blob: Blob, duration: number) => Promise<void>
}

export function VoiceRecordingBar({ recorder, onSend }: VoiceRecordingBarProps) {
  const { t } = useTranslation()
  const { state, duration, blob, durationRef, waveform, stop, cancel, reset } = recorder
  const [sending, setSending] = useState(false)

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  async function handleSend() {
    if (!blob) return
    setSending(true)
    try { await onSend(blob, durationRef.current); sounds.voiceSent() }
    finally { setSending(false); reset() }
  }

  if (state === 'idle') return null

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2.5 border-t border-destructive/20 bg-destructive/5 px-3 py-2.5 select-none touch-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-mono text-destructive tabular-nums w-10">{fmt(duration)}</span>
        </div>
        <Waveform data={waveform} />
        <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
          <span className="animate-bounce inline-block">↑</span>
          <span>{t("voice.lock")}</span>
        </div>
        <button type="button"
          onClick={() => { if (durationRef.current < 1) cancel(); else stop() }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95">
          <Send className="size-4 -translate-x-px" strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <div className="flex items-center gap-2.5 border-t border-destructive/20 bg-destructive/5 px-3 py-2.5">
        <button type="button" onClick={cancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="size-4" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-mono text-destructive tabular-nums w-10">{fmt(duration)}</span>
        </div>
        <Waveform data={waveform} />
        <Lock className="size-4 shrink-0 text-[--accent-brand]" strokeWidth={2} />
        <button type="button" onClick={stop}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95">
          <Send className="size-4 -translate-x-px" strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  if (state === 'preview' && blob) {
    return (
      <div className="flex items-center gap-2.5 border-t border-border bg-background px-3 py-2.5">
        <button type="button" onClick={cancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="size-4" strokeWidth={1.5} />
        </button>
        <VoicePlayer src={URL.createObjectURL(blob)} duration={durationRef.current} waveform={waveform} compact />
        <button type="button" onClick={handleSend} disabled={sending}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[--accent-brand] text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-50">
          {sending
            ? <div className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            : <Send className="size-4 -translate-x-px" strokeWidth={2.5} />
          }
        </button>
      </div>
    )
  }

  return null
}

// ─── VoicePlayer — TG-стиль ───────────────────────────────────────────────────

type VoicePlayerProps = {
  src: string
  duration?: number
  compact?: boolean
  isOwn?: boolean
  waveform?: number[]
}

export function VoicePlayer({ src, duration = 0, compact = false, isOwn = false, waveform: externalWave }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Используем реальный waveform если передан, иначе псевдо-волна из хэша src
  const staticWave = useRef<number[]>(
    externalWave && externalWave.length > 0
      ? externalWave
      : Array.from({ length: 40 }, (_, i) => {
          const c = src.charCodeAt(i % Math.max(src.length, 1)) / 255
          return Math.max(0.06, Math.abs(Math.sin(i * 0.9 + c * 4)) * 0.75 + 0.1)
        })
  ).current

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onloadedmetadata = () => { if (isFinite(audio.duration)) setAudioDuration(Math.round(audio.duration)) }
    audio.ontimeupdate = () => {
      setCurrentTime(Math.floor(audio.currentTime))
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    audio.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0) }
    return () => { audio.pause(); audio.src = '' }
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => null); setPlaying(true) }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('flex items-center gap-2.5', compact ? 'flex-1' : 'w-[220px] max-w-[260px]')}>
      <button type="button" onClick={togglePlay}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
          isOwn
            ? 'bg-background/20 text-background hover:bg-background/30'
            : 'bg-[--accent-brand] text-black hover:brightness-110',
        )}>
        {playing
          ? <Pause className="size-4" strokeWidth={2.5} />
          : <Play className="size-4 translate-x-px" strokeWidth={2.5} />
        }
      </button>

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="cursor-pointer" onClick={handleSeek}>
          <Waveform data={staticWave} isOwn={isOwn} progress={progress} isStatic />
        </div>
        <span className={cn('text-[10px] font-mono tabular-nums', isOwn ? 'text-background/60' : 'text-muted-foreground')}>
          {playing ? fmt(currentTime) : fmt(audioDuration)}
        </span>
      </div>
    </div>
  )
}

// Обратная совместимость
export function VoiceRecorder({ onSend, onCancel }: { onSend: (b: Blob, d: number) => Promise<void>; onCancel: () => void }) {
  return null
}
