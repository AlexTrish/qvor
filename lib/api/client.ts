type ApiResponse<T> = { data: T; error: null } | { data: null; error: string }

let refreshPromise: Promise<boolean> | null = null

// Дедупликация GET запросов — если тот же URL уже в полёте, возвращаем тот же промис
const inflight = new Map<string, Promise<Response>>()

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const key = method === 'GET' ? String(input) : null

  // Дедупликация: одновременные GET на один URL → один запрос
  if (key) {
    const existing = inflight.get(key)
    if (existing) return existing.then(r => r.clone())

    const promise = fetch(input, init).finally(() => inflight.delete(key))
    inflight.set(key, promise)

    const res = await promise
    if (res.status !== 401) return res

    // 401 — пробуем рефреш
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    }
    const ok = await refreshPromise
    if (!ok) return res
    return fetch(input, init)
  }

  // Мутирующие запросы — без дедупликации
  const res = await fetch(input, init)
  if (res.status !== 401) return res
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  const ok = await refreshPromise
  if (!ok) return res
  return fetch(input, init)
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await apiFetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error ?? 'Неизвестная ошибка' }
  return { data: json.data, error: null }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
