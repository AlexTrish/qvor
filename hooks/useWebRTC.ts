'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { sounds } from '@/lib/sounds'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...STUN_SERVERS]
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred })
  }
  return servers
}

export type CallState = 'idle' | 'calling' | 'connecting' | 'incoming' | 'connected' | 'ended'

export type IncomingCall = {
  callId: string
  from: string
  fromName: string
  fromAvatar: string | null
  video: boolean
}

type UseWebRTCOptions = {
  currentUserId: string
  onStateChange?: (state: CallState) => void
  onIncomingCall?: (name: string, avatar: string | null) => void
}

export function useWebRTC({ currentUserId, onStateChange, onIncomingCall }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isPeerMuted, setIsPeerMuted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false)

  // FIX #1: используем ref для callState чтобы избежать stale closure
  const callStateRef = useRef<CallState>('idle')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const callIdRef = useRef<string | null>(null)
  const peerIdRef = useRef<string | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const stopOutgoingRingtone = useRef<(() => void) | null>(null)
  const stopIncomingRingtone = useRef<(() => void) | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const peerSpeakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localAcRef = useRef<AudioContext | null>(null)
  // FIX #6: ref для остановки speaking detection loop
  const speakingActiveRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const endingRef = useRef(false)
  const incomingCallRef = useRef<IncomingCall | null>(null)

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)

  const setState = useCallback((s: CallState) => {
    callStateRef.current = s
    setCallState(s)
    onStateChange?.(s)
  }, [onStateChange])

  useEffect(() => {
    incomingCallRef.current = incomingCall
  }, [incomingCall])

  // Скрытый audio элемент для аудиозвонков
  useEffect(() => {
    const audio = new Audio()
    audio.autoplay = true
    audio.style.display = 'none'
    document.body.appendChild(audio)
    remoteAudioRef.current = audio
    return () => {
      audio.srcObject = null
      audio.remove()
    }
  }, [])

  function applyRemoteStream(stream: MediaStream) {
    remoteStreamRef.current = stream
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream
  }

  function signalRaw(type: string, to: string, callId: string, payload: Record<string, unknown> = {}) {
    const msg = JSON.stringify({ type, to, callId, ...payload })
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg)
    } else {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: msg,
      }).catch(() => null)
    }
  }

  function signal(type: string, payload: Record<string, unknown> = {}) {
    if (!peerIdRef.current || !callIdRef.current) return
    signalRaw(type, peerIdRef.current, callIdRef.current, payload)
  }

  // FIX #5: закрываем старый WS перед созданием нового
  function connectWS(token: string) {
    if (wsRef.current) {
      wsRef.current.onclose = null // предотвращаем авто-реконнект
      wsRef.current.close()
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? `wss://${window.location.host}/ws`
    const ws = new WebSocket(`${wsUrl}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        switch (msg.type) {
          case 'offer':        handleOffer(msg); break
          case 'offer_update': handleOfferUpdate(msg); break
          case 'answer':       handleAnswer(msg); break
          case 'ice':          handleIce(msg); break
          case 'end':          handleEnd(msg); break
          case 'reject':       handleReject(msg); break
        }
      } catch {}
    }

    ws.onclose = () => {
      setTimeout(() => {
        fetchWsToken().then(t => { if (t) connectWS(t) })
      }, 5000)
    }
  }

  async function fetchWsToken(): Promise<string | null> {
    try {
      const res = await fetch('/api/auth/ws-token', { credentials: 'include' })
      if (!res.ok) return null
      const json = await res.json()
      return json.data?.token ?? null
    } catch {
      return null
    }
  }

  // FIX #6: speaking detection с флагом остановки
  function startSpeakingDetection(stream: MediaStream) {
    speakingActiveRef.current = true
    try {
      const ac = new AudioContext()
      localAcRef.current = ac
      const source = ac.createMediaStreamSource(stream)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      function tick() {
        if (!speakingActiveRef.current) return // останавливаем loop
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((s, v) => s + v, 0) / data.length
        setIsSpeaking(avg > 15)
        if (dataChannelRef.current?.readyState === 'open') {
          dataChannelRef.current.send(JSON.stringify({ type: 'speaking', value: avg > 15 }))
        }
        requestAnimationFrame(tick)
      }
      tick()
    } catch {}
  }

  function setupDataChannel(dc: RTCDataChannel) {
    dataChannelRef.current = dc
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'speaking') {
          setIsPeerSpeaking(msg.value)
          if (msg.value) {
            if (peerSpeakingTimerRef.current) clearTimeout(peerSpeakingTimerRef.current)
            peerSpeakingTimerRef.current = setTimeout(() => setIsPeerSpeaking(false), 800)
          }
        }
        if (msg.type === 'mute') setIsPeerMuted(msg.value)
      } catch {}
    }
  }

  function createPC() {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() })

    pc.onicecandidate = (e) => {
      if (e.candidate) signal('ice', { candidate: JSON.stringify(e.candidate) })
    }

    pc.ontrack = (e) => {
      if (e.streams[0]) applyRemoteStream(e.streams[0])
    }

    pc.ondatachannel = (e) => setupDataChannel(e.channel)

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connecting') setState('connecting')
      if (pc.connectionState === 'connected') setState('connected')
      if ((pc.connectionState === 'disconnected' || pc.connectionState === 'failed') && !endingRef.current) {
        cleanup(true)
      }
    }

    pc.onnegotiationneeded = async () => {
      // Только при активном звонке, не при первоначальном создании
      if (!peerIdRef.current || !callIdRef.current) return
      if (callStateRef.current !== 'connected') return
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        signal('offer_update', { sdp: offer.sdp! })
      } catch {}
    }

    pcRef.current = pc
    return pc
  }

  async function getMedia(video: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { width: 1280, height: 720, facingMode: 'user' } : false,
    })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }

  function cleanup(sendEnd: boolean) {
    endingRef.current = true

    // FIX #6: останавливаем speaking detection loop
    speakingActiveRef.current = false

    if (sendEnd && peerIdRef.current && callIdRef.current) {
      signal('end')
    }

    stopOutgoingRingtone.current?.()
    stopOutgoingRingtone.current = null
    stopIncomingRingtone.current?.()
    stopIncomingRingtone.current = null

    dataChannelRef.current?.close()
    dataChannelRef.current = null
    localAcRef.current?.close()
    localAcRef.current = null
    if (peerSpeakingTimerRef.current) clearTimeout(peerSpeakingTimerRef.current)

    setIsSpeaking(false)
    setIsPeerSpeaking(false)
    setIsPeerMuted(false)

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    remoteStreamRef.current = null

    pcRef.current?.close()
    pcRef.current = null
    pendingCandidates.current = []

    peerIdRef.current = null
    callIdRef.current = null
    setIncomingCall(null)
    incomingCallRef.current = null
    setIsAudioMuted(false)
    setIsCameraOff(false)

    setTimeout(() => { endingRef.current = false }, 500)
  }

  // FIX #1: используем callStateRef вместо callState
  const startCall = useCallback(async (peerId: string, video: boolean) => {
    if (callStateRef.current !== 'idle') return
    peerIdRef.current = peerId
    callIdRef.current = crypto.randomUUID()
    setIsVideoEnabled(video)
    setState('calling')

    try {
      const stream = await getMedia(video)
      const pc = createPC()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const dc = pc.createDataChannel('meta')
      setupDataChannel(dc)
      startSpeakingDetection(stream)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      signal('offer', { sdp: offer.sdp!, video })
      stopOutgoingRingtone.current = sounds.callOutgoing()
    } catch {
      cleanup(false)
      setState('idle')
    }
  }, [])

  // FIX #3: правильный порядок — сначала setLocalDescription, потом setState
  const acceptCall = useCallback(async () => {
    const ic = incomingCallRef.current
    if (!ic) return

    stopIncomingRingtone.current?.()
    stopIncomingRingtone.current = null

    setIsVideoEnabled(ic.video)
    setIncomingCall(null)
    incomingCallRef.current = null

    try {
      const stream = await getMedia(ic.video)
      const pc = pcRef.current!
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => null)
      }
      pendingCandidates.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      signal('answer', { sdp: answer.sdp! })
      startSpeakingDetection(stream)

      // FIX #3: setState после setLocalDescription
      setState('connected')
      sounds.callConnected()

      if (remoteStreamRef.current) applyRemoteStream(remoteStreamRef.current)
    } catch {
      cleanup(true)
      setState('idle')
    }
  }, [])

  const rejectCall = useCallback(() => {
    const ic = incomingCallRef.current
    if (!ic) return

    stopIncomingRingtone.current?.()
    stopIncomingRingtone.current = null

    signalRaw('reject', ic.from, ic.callId)

    pcRef.current?.close()
    pcRef.current = null
    pendingCandidates.current = []
    remoteStreamRef.current = null
    peerIdRef.current = null
    callIdRef.current = null
    setIncomingCall(null)
    incomingCallRef.current = null
    setState('idle')
  }, [])

  const endCall = useCallback(() => {
    sounds.callEnded()
    cleanup(true)
    // FIX #4: не вызываем setState('ended') после cleanup — cleanup уже не меняет state
    setState('ended')
    setTimeout(() => setState('idle'), 2000)
  }, [])

  // FIX #7: исправлена логика mute — track.enabled=true означает НЕ замьючен
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    const nowMuted = !track.enabled
    setIsAudioMuted(nowMuted)
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'mute', value: nowMuted }))
    }
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(v => !v)
  }, [])

  const enableVideo = useCallback(async () => {
    if (isVideoEnabled) return
    const pc = pcRef.current
    const localStream = localStreamRef.current
    if (!pc) return

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      })
      const videoTrack = videoStream.getVideoTracks()[0]

      // Если уже есть видео sender — заменяем трек через replaceTrack
      const existingSender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (existingSender) {
        await existingSender.replaceTrack(videoTrack)
      } else {
        // Добавляем новый трек — триггерит onnegotiationneeded → offer_update
        if (localStream) {
          localStream.addTrack(videoTrack)
          pc.addTrack(videoTrack, localStream)
        }
      }

      if (localStream) {
        // Удаляем старые видеотреки из потока
        localStream.getVideoTracks().forEach(t => { if (t !== videoTrack) { t.stop(); localStream.removeTrack(t) } })
        localStream.addTrack(videoTrack)
      } else {
        const newStream = new MediaStream([videoTrack])
        localStreamRef.current = newStream
      }

      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      setIsVideoEnabled(true)
      setIsCameraOff(false)
    } catch {}
  }, [isVideoEnabled])

  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)

  const shareScreen = useCallback(async () => {
    const pc = pcRef.current
    const localStream = localStreamRef.current
    if (!pc) return

    if (isSharingScreen) {
      screenTrackRef.current?.stop()
      screenTrackRef.current = null
      setIsSharingScreen(false)
      if (isVideoEnabled && localStream) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
          const camTrack = camStream.getVideoTracks()[0]
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(camTrack)
          }
          localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t) })
          localStream.addTrack(camTrack)
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream
        } catch {}
      } else {
        // Выключаем видео sender
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(null).catch(() => null)
        setIsVideoEnabled(false)
      }
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const screenTrack = screenStream.getVideoTracks()[0]
      screenTrackRef.current = screenTrack

      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(screenTrack)
      } else {
        // Нет видео sender — добавляем трек (onnegotiationneeded отправит offer_update)
        const stream = localStream ?? new MediaStream()
        stream.addTrack(screenTrack)
        pc.addTrack(screenTrack, stream)
        if (!localStream) localStreamRef.current = stream
      }

      if (localStream) {
        localStream.getVideoTracks().forEach(t => { if (t !== screenTrack) { t.stop(); localStream.removeTrack(t) } })
        if (!localStream.getVideoTracks().includes(screenTrack)) localStream.addTrack(screenTrack)
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current

      setIsSharingScreen(true)
      setIsVideoEnabled(true)
      setIsCameraOff(false)

      screenTrack.onended = () => { if (isSharingScreen) shareScreen() }
    } catch {}
  }, [isSharingScreen, isVideoEnabled])
  // FIX #1: используем callStateRef вместо callState
  const handleOffer = useCallback(async (data: { from: string; fromName: string; fromAvatar: string | null; callId: string; sdp: string; video: boolean }) => {
    if (callStateRef.current !== 'idle') {
      signalRaw('reject', data.from, data.callId)
      return
    }

    peerIdRef.current = data.from
    callIdRef.current = data.callId

    setIncomingCall({ callId: data.callId, from: data.from, fromName: data.fromName, fromAvatar: data.fromAvatar, video: data.video })
    setState('incoming')
    onIncomingCall?.(data.fromName, data.fromAvatar)
    stopIncomingRingtone.current = sounds.callRingtone()

    const pc = createPC()
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }))
  }, [onIncomingCall])

  const handleAnswer = useCallback(async (data: { from: string; callId: string; sdp: string }) => {
    if (data.callId !== callIdRef.current) return
    const pc = pcRef.current
    if (!pc) return
    stopOutgoingRingtone.current?.()
    stopOutgoingRingtone.current = null
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }))
    sounds.callConnected()
    setState('connected')
  }, [])

  const handleIce = useCallback(async (data: { from: string; callId: string; candidate: string }) => {
    if (data.callId !== callIdRef.current) return
    const candidate = JSON.parse(data.candidate) as RTCIceCandidateInit
    const pc = pcRef.current
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null)
    } else {
      pendingCandidates.current.push(candidate)
    }
  }, [])

  // FIX #4: убираем двойной вызов setState
  const handleEnd = useCallback((data: { from: string; callId: string }) => {
    const ic = incomingCallRef.current
    const matchById = data.callId && callIdRef.current && data.callId === callIdRef.current
    const matchByFrom = data.from && peerIdRef.current && data.from === peerIdRef.current
    const matchIncoming = ic && (data.callId === ic.callId || data.from === ic.from)

    if (!matchById && !matchByFrom && !matchIncoming) return

    sounds.callEnded()
    cleanup(false)
    setState('ended')
    setTimeout(() => setState('idle'), 2000)
  }, [])

  const handleReject = useCallback((data: { from: string; callId: string }) => {
    if (data.callId !== callIdRef.current) return
    cleanup(false)
    setState('ended')
    setTimeout(() => setState('idle'), 2000)
  }, [])

  const handleOfferUpdate = useCallback(async (data: { from: string; callId: string; sdp: string }) => {
    if (data.callId !== callIdRef.current) return
    const pc = pcRef.current
    if (!pc) return
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    signal('answer', { sdp: answer.sdp! })
    const hasVideo = pc.getReceivers().some(r => r.track?.kind === 'video')
    if (hasVideo) setIsVideoEnabled(true)
  }, [])

  useEffect(() => {
    fetchWsToken().then(token => { if (token) connectWS(token) })
    return () => {
      // FIX #5 + #6: корректная очистка при размонтировании
      speakingActiveRef.current = false
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      pcRef.current?.close()
      localAcRef.current?.close()
    }
  }, [])

  return {
    callState,
    incomingCall,
    isVideoEnabled,
    isAudioMuted,
    isCameraOff,
    isSharingScreen,
    isPeerMuted,
    isSpeaking,
    isPeerSpeaking,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    enableVideo,
    shareScreen,
    handleOffer,
    handleAnswer,
    handleIce,
    handleEnd,
    handleReject,
    handleOfferUpdate,
  }
}
