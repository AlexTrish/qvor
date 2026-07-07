'use client'

import { useState, useEffect } from 'react'
import { Mail, X, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function EmailSetupModal() {
  const { user, refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Показываем если пользователь авторизован и нет email
    if (user && !user.email && !sessionStorage.getItem('email_setup_dismissed')) {
      // Небольшая задержка чтобы не мешать загрузке
      const t = setTimeout(() => setOpen(true), 2000)
      return () => clearTimeout(t)
    }
  }, [user?.id, user?.email])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сохранения')
      await refreshUser()
      setDone(true)
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('email_setup_dismissed', '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[--accent-brand-muted]">
              <Mail className="size-4 text-[--accent-brand]" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold">Добавьте email</p>
          </div>
          <button type="button" onClick={handleDismiss}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-500/15">
              <Mail className="size-6 text-green-500" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-green-600">Email сохранён!</p>
            <p className="text-xs text-muted-foreground">Теперь коды подтверждения будут приходить на почту</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Добавьте email чтобы получать коды подтверждения при входе. Это удобнее и надёжнее.
            </p>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                required
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-[--accent-brand] focus:ring-2 focus:ring-[--accent-brand]/20"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={handleDismiss}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/40 transition-all">
                Позже
              </button>
              <button type="submit" disabled={saving || !email.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[--accent-brand] py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50 transition-all">
                {saving
                  ? <div className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  : <><span>Сохранить</span><ArrowRight className="size-3.5" strokeWidth={2} /></>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
