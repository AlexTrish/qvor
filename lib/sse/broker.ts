// In-memory SSE broker. При горизонтальном масштабировании заменить на Redis Pub/Sub.

export type SSEEvent =
  | { type: 'msg';      data: Record<string, unknown> }
  | { type: 'medit';    data: { id: string; ct: string; iv: string; ea: string } }
  | { type: 'mdel';     data: { id: string } }
  | { type: 'typ';      data: { f: string; t: string; v: boolean } }
  | { type: 'pre';      data: { u: string; on: boolean; ls: string } }
  | { type: 'conv_new'; data: Record<string, unknown> }
  | { type: 'user_upd'; data: { id: string; avatarUrl?: string | null; displayName?: string | null } }
  | { type: 'read';     data: { byUserId: string; readAt: string } }
  | { type: 'notif';    data: Record<string, unknown> }
  | { type: 'call_offer';   data: { from: string; fromName: string; fromAvatar: string | null; callId: string; sdp: string; video: boolean } }
  | { type: 'call_offer_update'; data: { from: string; callId: string; sdp: string } }
  | { type: 'call_answer';  data: { from: string; callId: string; sdp: string } }
  | { type: 'call_ice';     data: { from: string; callId: string; candidate: string } }
  | { type: 'call_end';     data: { from: string; callId: string } }
  | { type: 'call_reject';  data: { from: string; callId: string } }
  | { type: 'call_join';    data: { from: string; fromName: string; fromAvatar: string | null; callId: string } }
  | { type: 'call_leave';   data: { from: string; callId: string } }
  | { type: 'ping' }

export type SSEEventLegacy =
  | { type: 'message';        data: Record<string, unknown> }
  | { type: 'message_edit';   data: { id: string; ciphertext: string; iv: string; editedAt: string } }
  | { type: 'message_delete'; data: { id: string } }
  | { type: 'typing';         data: { fromUserId: string; toUserId: string; isTyping: boolean } }
  | { type: 'presence';       data: { userId: string; isOnline: boolean; lastSeenAt: string } }
  | { type: 'conv_new';       data: Record<string, unknown> }
  | { type: 'user_update';    data: { id: string; avatarUrl?: string | null; displayName?: string | null } }
  | { type: 'read';           data: { byUserId: string; readAt: string } }
  | { type: 'notif';          data: Record<string, unknown> }
  | { type: 'call_offer';     data: { from: string; fromName: string; fromAvatar: string | null; callId: string; sdp: string; video: boolean } }
  | { type: 'call_offer_update'; data: { from: string; callId: string; sdp: string } }
  | { type: 'call_answer';    data: { from: string; callId: string; sdp: string } }
  | { type: 'call_ice';       data: { from: string; callId: string; candidate: string } }
  | { type: 'call_end';       data: { from: string; callId: string } }
  | { type: 'call_reject';    data: { from: string; callId: string } }
  | { type: 'call_join';      data: { from: string; fromName: string; fromAvatar: string | null; callId: string } }
  | { type: 'call_leave';     data: { from: string; callId: string } }
  | { type: 'ping' }

type Subscriber = (event: SSEEventLegacy) => void

function expand(e: SSEEvent): SSEEventLegacy {
  switch (e.type) {
    case 'msg':      return { type: 'message', data: e.data }
    case 'medit':    return { type: 'message_edit', data: { id: e.data.id, ciphertext: e.data.ct, iv: e.data.iv, editedAt: e.data.ea } }
    case 'mdel':     return { type: 'message_delete', data: { id: e.data.id } }
    case 'typ':      return { type: 'typing', data: { fromUserId: e.data.f, toUserId: e.data.t, isTyping: e.data.v } }
    case 'pre':      return { type: 'presence', data: { userId: e.data.u, isOnline: e.data.on, lastSeenAt: e.data.ls } }
    case 'conv_new': return { type: 'conv_new', data: e.data }
    case 'user_upd': return { type: 'user_update', data: e.data }
    case 'read':     return { type: 'read', data: e.data }
    case 'notif':    return { type: 'notif', data: e.data }
    case 'call_offer':        return { type: 'call_offer', data: e.data }
    case 'call_offer_update':  return { type: 'call_offer_update', data: e.data }
    case 'call_answer': return { type: 'call_answer', data: e.data }
    case 'call_ice':    return { type: 'call_ice', data: e.data }
    case 'call_end':    return { type: 'call_end', data: e.data }
    case 'call_reject': return { type: 'call_reject', data: e.data }
    case 'call_join':   return { type: 'call_join', data: e.data }
    case 'call_leave':  return { type: 'call_leave', data: e.data }
    case 'ping':     return { type: 'ping' }
  }
}

class SSEBroker {
  private subs = new Map<string, Set<Subscriber>>()
  private presenceCache = new Map<string, { isOnline: boolean; lastSeenAt: string }>()
  private typingThrottle = new Map<string, number>()

  constructor() {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const cutoff = Date.now() - 60_000
        for (const [k, ts] of this.typingThrottle) {
          if (ts < cutoff) this.typingThrottle.delete(k)
        }
        if (this.presenceCache.size > 10_000) this.presenceCache.clear()
      }, 5 * 60_000)
    }
  }

  subscribe(userId: string, fn: Subscriber): () => void {
    if (!this.subs.has(userId)) this.subs.set(userId, new Set())
    this.subs.get(userId)!.add(fn)
    return () => {
      this.subs.get(userId)?.delete(fn)
      if (this.subs.get(userId)?.size === 0) this.subs.delete(userId)
    }
  }

  publish(userId: string, event: SSEEvent): void {
    if (event.type === 'pre') {
      const cached = this.presenceCache.get(event.data.u)
      if (cached?.isOnline === event.data.on) return
      this.presenceCache.set(event.data.u, { isOnline: event.data.on, lastSeenAt: event.data.ls })
    }
    if (event.type === 'typ') {
      const key = `${event.data.f}→${event.data.t}`
      const last = this.typingThrottle.get(key) ?? 0
      const now = Date.now()
      if (now - last < 500) return
      this.typingThrottle.set(key, now)
    }
    const legacy = expand(event)
    this.subs.get(userId)?.forEach(fn => fn(legacy))
  }

  publishMany(userIds: string[], event: SSEEvent): void {
    userIds.forEach(id => this.publish(id, event))
  }

  connectedUsers(): string[] {
    return [...this.subs.keys()]
  }

  isConnected(userId: string): boolean {
    return (this.subs.get(userId)?.size ?? 0) > 0
  }
}

const g = globalThis as typeof globalThis & { __sseBroker?: SSEBroker }
if (!g.__sseBroker) g.__sseBroker = new SSEBroker()
export const broker = g.__sseBroker
