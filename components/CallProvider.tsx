'use client'

import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useGroupCall } from '@/hooks/useGroupCall'
import { useSSE } from '@/hooks/useSSE'
import { IncomingCallModal, ActiveCallView } from '@/components/CallView'
import { GroupCallView } from '@/components/GroupCallView'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api/client'

const AUTH_PATHS = ['/login', '/register', '/recover', '/banned', '/device-link']

type CallContextValue = {
  startCall: (peerId: string, video: boolean) => void
  startGroupCall: (channelId: string, channelName: string, video: boolean) => void
}

const CallContext = createContext<CallContextValue>({ startCall: () => {}, startGroupCall: () => {} })

export function useCall() {
  return useContext(CallContext)
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // На auth страницах не инициализируем звонки
  if (isAuthPage) {
    return <CallContext.Provider value={{ startCall: () => {}, startGroupCall: () => {} }}>{children}</CallContext.Provider>
  }
  const [callPeerName, setCallPeerName] = useState('')
  const [callPeerAvatar, setCallPeerAvatar] = useState<string | null>(null)
  const [groupChannelName, setGroupChannelName] = useState('')
  const callStartRef = useRef<number | null>(null)
  const callVideoRef = useRef(false)
  const callPeerIdRef = useRef<string | null>(null)

  async function saveCallLog(peerId: string, video: boolean, durationSec: number | null) {
    await apiFetch('/api/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, callType: video ? 'video' : 'audio', callDuration: durationSec }),
    }).catch(() => null)
  }

  // ─── 1-на-1 звонок ────────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    currentUserId: user?.id ?? '',
    onIncomingCall: (name, avatar) => {
      setCallPeerName(name)
      setCallPeerAvatar(avatar)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const show = () => new Notification(`📞 ${name}`, {
          body: 'Входящий звонок — нажмите чтобы ответить',
          icon: avatar ?? '/icon-192.png',
          tag: 'incoming-call',
          requireInteraction: true,
        })
        if (Notification.permission === 'granted') show()
        else if (Notification.permission === 'default') {
          Notification.requestPermission().then(p => { if (p === 'granted') show() })
        }
      }
    },
    onStateChange: (state) => {
      if (state === 'connected') callStartRef.current = Date.now()
      if (state === 'ended' || state === 'idle') {
        const peerId = callPeerIdRef.current
        if (peerId) {
          const dur = callStartRef.current ? Math.round((Date.now() - callStartRef.current) / 1000) : null
          saveCallLog(peerId, callVideoRef.current, dur)
          callStartRef.current = null
          callPeerIdRef.current = null
        }
      }
    },
  })

  async function startCallWithLog(peerId: string, video: boolean) {
    callPeerIdRef.current = peerId
    callVideoRef.current = video
    callStartRef.current = null
    try {
      const res = await apiFetch(`/api/users/${peerId}`)
      const json = await res.json()
      const peer = json.data
      if (peer) {
        setCallPeerName(peer.displayName || peer.username || `#${peer.numericId}`)
        setCallPeerAvatar(peer.avatarUrl ?? null)
      }
    } catch {}
    webrtc.startCall(peerId, video)
  }

  // ─── Групповой звонок ─────────────────────────────────────────────────────
  const groupCall = useGroupCall(user?.id ?? '')

  async function startGroupCallWithName(channelId: string, channelName: string, video: boolean) {
    setGroupChannelName(channelName)
    await groupCall.startGroupCall(channelId, video)
  }

  // ─── SSE ──────────────────────────────────────────────────────────────────
  useSSE({
    // 1-на-1
    call_offer:        (data: any) => {
      // Если идёт групповой звонок — это offer от нового участника группы
      if (groupCall.active) {
        groupCall.handleGroupOffer(data)
      } else {
        setCallPeerName(data.fromName)
        setCallPeerAvatar(data.fromAvatar)
        callPeerIdRef.current = data.from
        callVideoRef.current = data.video
        webrtc.handleOffer(data)
      }
    },
    call_offer_update: (data: any) => webrtc.handleOfferUpdate(data),
    call_answer:       (data: any) => {
      if (groupCall.active) groupCall.handleAnswer(data)
      else webrtc.handleAnswer(data)
    },
    call_ice:          (data: any) => {
      if (groupCall.active) groupCall.handleIce(data)
      else webrtc.handleIce(data)
    },
    call_end:          (data: any) => webrtc.handleEnd(data),
    call_reject:       (data: any) => webrtc.handleReject(data),
    // Групповые
    call_join:         (data: any) => groupCall.handleJoin(data),
    call_leave:        (data: any) => groupCall.handleLeave(data),
  })

  const localParticipant = {
    userId: user?.id ?? '',
    name: user?.displayName || user?.username || 'Вы',
    avatar: user?.avatarUrl ?? null,
    stream: null,
    isMuted: groupCall.isAudioMuted,
    isCameraOff: !groupCall.isVideoEnabled,
  }

  return (
    <CallContext.Provider value={{ startCall: startCallWithLog, startGroupCall: startGroupCallWithName }}>
      {children}

      {/* 1-на-1 входящий */}
      {webrtc.incomingCall && (
        <IncomingCallModal
          call={webrtc.incomingCall}
          onAccept={webrtc.acceptCall}
          onReject={webrtc.rejectCall}
        />
      )}

      {/* 1-на-1 активный */}
      {webrtc.callState !== 'idle' && !webrtc.incomingCall && (
        <ActiveCallView
          callState={webrtc.callState}
          peerName={callPeerName}
          peerAvatar={callPeerAvatar}
          myAvatar={user?.avatarUrl ?? null}
          myName={user?.displayName || user?.username || ''}
          isVideoEnabled={webrtc.isVideoEnabled}
          isAudioMuted={webrtc.isAudioMuted}
          isCameraOff={webrtc.isCameraOff}
          isSharingScreen={webrtc.isSharingScreen}
          isPeerMuted={webrtc.isPeerMuted}
          isSpeaking={webrtc.isSpeaking}
          isPeerSpeaking={webrtc.isPeerSpeaking}
          localVideoRef={webrtc.localVideoRef}
          remoteVideoRef={webrtc.remoteVideoRef}
          onEnd={webrtc.endCall}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onEnableVideo={webrtc.enableVideo}
          onShareScreen={webrtc.shareScreen}
        />
      )}

      {/* Групповой активный */}
      {groupCall.active && (
        <GroupCallView
          channelName={groupChannelName}
          participants={groupCall.participants}
          localParticipant={localParticipant}
          isAudioMuted={groupCall.isAudioMuted}
          isVideoEnabled={groupCall.isVideoEnabled}
          localStreamRef={groupCall.localStreamRef}
          onLeave={groupCall.leaveGroupCall}
          onToggleMute={groupCall.toggleMute}
          onToggleCamera={groupCall.toggleCamera}
        />
      )}
    </CallContext.Provider>
  )
}
