'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export type SSEEventType = 'message' | 'message_edit' | 'message_delete' | 'typing' | 'presence' | 'conv_new' | 'user_update' | 'read' | 'notif' | 'ping' | 'call_offer' | 'call_offer_update' | 'call_answer' | 'call_ice' | 'call_end' | 'call_reject' | 'call_join' | 'call_leave'

type SSEHandler = (data: unknown) => void

const MIN_RETRY = 1_000
const MAX_RETRY = 15_000
const MAX_ERRORS = 3 // максимум 3 попытки при ошибках авторизации

const AUTH_PATHS = ['/login', '/register', '/recover', '/banned', '/device-link']

export function useSSE(handlers: Partial<Record<SSEEventType, SSEHandler>>) {
  const pathname = usePathname()
  const esRef = useRef<EventSource | null>(null)
  const handlersRef = useRef(handlers)
  const retryDelay = useRef(MIN_RETRY)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const errorCount = useRef(0)
  handlersRef.current = handlers

  const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  const connect = useCallback(() => {
    if (unmounted.current) return
    if (isAuthPage) return
    if (errorCount.current >= MAX_ERRORS) return

    if (esRef.current) esRef.current.close()

    const es = new EventSource('/api/sse', { withCredentials: true })
    esRef.current = es

    const events: SSEEventType[] = [
      'message', 'message_edit', 'message_delete', 'typing', 'presence',
      'conv_new', 'user_update', 'read', 'notif', 'ping',
      'call_offer', 'call_offer_update', 'call_answer', 'call_ice',
      'call_end', 'call_reject', 'call_join', 'call_leave',
    ]

    events.forEach(name => {
      es.addEventListener(name, (e: MessageEvent) => {
        const handler = handlersRef.current[name]
        if (!handler) return
        try { handler(name === 'ping' ? null : JSON.parse(e.data)) } catch {}
      })
    })

    es.onopen = () => {
      retryDelay.current = MIN_RETRY
      errorCount.current = 0
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      if (unmounted.current) return

      errorCount.current++
      if (errorCount.current >= MAX_ERRORS) return // стоп — не авторизован

      const delay = retryDelay.current
      retryDelay.current = Math.min(delay * 2, MAX_RETRY)
      retryTimer.current = setTimeout(connect, delay)
    }
  }, [isAuthPage])

  useEffect(() => {
    if (isAuthPage) return

    unmounted.current = false
    errorCount.current = 0
    connect()

    function onVisibilityChange() {
      if (document.hidden) {
        esRef.current?.close()
        esRef.current = null
        if (retryTimer.current) clearTimeout(retryTimer.current)
      } else {
        retryDelay.current = MIN_RETRY
        if (errorCount.current < MAX_ERRORS) connect()
      }
    }

    function onOnline() {
      retryDelay.current = MIN_RETRY
      errorCount.current = 0
      if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) connect()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', onOnline)

    return () => {
      unmounted.current = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
      esRef.current?.close()
      esRef.current = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
    }
  }, [connect, isAuthPage])
}
