'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { sounds } from '@/lib/sounds'

export type GroupParticipant = {
  userId: string
  name: string
  avatar: string | null
  stream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
}

type PeerConn = {
  pc: RTCPeerConnection
  userId: string
}

const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function getIceServers(): RTCIceServer[] {
  const servers = [...STUN]
  const url = process.env.NEXT_PUBLIC_TURN_URL
  const user = process.env.NEXT_PUBLIC_TURN_USERNAME
  const cred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
  if (url && user && cred) servers.push({ urls: url, username: user, credential: cred })
  return servers
}

export function useGroupCall(currentUserId: string) {
  const [active, setActive] = useState(false)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<GroupParticipant[]>([])
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(false)

  const peersRef = useRef<Map<string, PeerConn>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const callIdRef = useRef<string | null>(null)
  const channelIdRef = useRef<string | null>(null)

  function signal(type: string, payload: Record<string, unknown>) {
    fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    }).catch(() => null)
  }

  function createPC(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() })

    pc.onicecandidate = e => {
      if (e.candidate) {
        signal('ice', { to: peerId, callId: callIdRef.current, candidate: JSON.stringify(e.candidate) })
      }
    }

    pc.ontrack = e => {
      const stream = e.streams[0]
      if (!stream) return
      setParticipants(prev => prev.map(p =>
        p.userId === peerId ? { ...p, stream } : p
      ))
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(peerId)
      }
    }

    peersRef.current.set(peerId, { pc, userId: peerId })
    return pc
  }

  function removePeer(peerId: string) {
    const peer = peersRef.current.get(peerId)
    if (peer) { peer.pc.close(); peersRef.current.delete(peerId) }
    setParticipants(prev => prev.filter(p => p.userId !== peerId))
  }

  async function startGroupCall(chId: string, video: boolean) {
    if (active) return
    const cId = crypto.randomUUID()
    callIdRef.current = cId
    channelIdRef.current = chId
    setCallId(cId)
    setChannelId(chId)
    setIsVideoEnabled(video)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video })
      localStreamRef.current = stream
      setActive(true)
      sounds.callConnected()

      // Уведомляем всех участников канала
      signal('join', { channelId: chId, callId: cId, video })
    } catch {
      setActive(false)
    }
  }

  async function leaveGroupCall() {
    if (!active) return
    const chId = channelIdRef.current
    const cId = callIdRef.current

    if (chId && cId) signal('leave', { channelId: chId, callId: cId })

    // Закрываем все P2P соединения
    peersRef.current.forEach(({ pc }) => pc.close())
    peersRef.current.clear()

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    setActive(false)
    setParticipants([])
    setChannelId(null)
    setCallId(null)
    callIdRef.current = null
    channelIdRef.current = null
    sounds.callEnded()
  }

  // Когда кто-то присоединился — инициируем P2P offer
  const handleJoin = useCallback(async (data: { from: string; fromName: string; fromAvatar: string | null; callId: string }) => {
    if (!active || data.callId !== callIdRef.current) return
    if (peersRef.current.has(data.from)) return

    // Добавляем участника
    setParticipants(prev => {
      if (prev.find(p => p.userId === data.from)) return prev
      return [...prev, { userId: data.from, name: data.fromName, avatar: data.fromAvatar, stream: null, isMuted: false, isCameraOff: false }]
    })

    // Создаём P2P соединение и отправляем offer
    const pc = createPC(data.from)
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    signal('offer_group', { to: data.from, callId: callIdRef.current, sdp: offer.sdp!, video: isVideoEnabled })
  }, [active, isVideoEnabled])

  const handleLeave = useCallback((data: { from: string; callId: string }) => {
    if (data.callId !== callIdRef.current) return
    removePeer(data.from)
  }, [])

  // Входящий offer от участника группового звонка
  const handleGroupOffer = useCallback(async (data: { from: string; fromName: string; fromAvatar: string | null; callId: string; sdp: string; video: boolean }) => {
    if (!active) return

    // Добавляем участника если ещё нет
    setParticipants(prev => {
      if (prev.find(p => p.userId === data.from)) return prev
      return [...prev, { userId: data.from, name: data.fromName, avatar: data.fromAvatar, stream: null, isMuted: false, isCameraOff: false }]
    })

    let pc = peersRef.current.get(data.from)?.pc
    if (!pc) {
      pc = createPC(data.from)
      localStreamRef.current?.getTracks().forEach(t => pc!.addTrack(t, localStreamRef.current!))
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    signal('answer', { to: data.from, callId: callIdRef.current, sdp: answer.sdp! })
  }, [active])

  const handleAnswer = useCallback(async (data: { from: string; callId: string; sdp: string }) => {
    const peer = peersRef.current.get(data.from)
    if (!peer) return
    await peer.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }))
  }, [])

  const handleIce = useCallback(async (data: { from: string; callId: string; candidate: string }) => {
    const peer = peersRef.current.get(data.from)
    if (!peer) return
    const candidate = JSON.parse(data.candidate) as RTCIceCandidateInit
    await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null)
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsAudioMuted(!track.enabled)
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsVideoEnabled(v => !v)
  }, [])

  useEffect(() => {
    return () => {
      peersRef.current.forEach(({ pc }) => pc.close())
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return {
    active, channelId, callId, participants, isVideoEnabled, isAudioMuted,
    localStreamRef,
    startGroupCall, leaveGroupCall,
    handleJoin, handleLeave, handleGroupOffer, handleAnswer, handleIce,
    toggleMute, toggleCamera,
  }
}
