'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">Что-то пошло не так</p>
            <p className="mt-1 text-xs text-muted-foreground">{this.state.error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-muted/40"
          >
            <RefreshCw className="size-3.5" strokeWidth={1.5} />
            Попробовать снова
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
