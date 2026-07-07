'use client'

import { useState, useCallback } from 'react'

export function useFormSession<T extends object>(
  key: string,
  initial: T,
): [T, (partial: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(initial)

  const setForm = useCallback((partial: Partial<T>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const clearForm = useCallback(() => {
    setState(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [state, setForm, clearForm]
}
