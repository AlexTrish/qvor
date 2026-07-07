'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { ColorPicker } from '@/components/ColorPicker'

export type BannerConfig = {
  type: 'solid' | 'gradient' | 'emoji'
  color?: string
  gradient?: [string, string, number]
  emoji?: string
  emojiOpacity?: number
  bg?: string
  bgGradient?: [string, string, number]
}

const SOLID_PRESETS = [
  '#18181b', '#27272a', '#3f3f46',
  '#1e3a5f', '#1e4d2b', '#4a1942',
  '#7c2d12', '#1c1917', '#0f172a',
  '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899',
]

const GRADIENT_PRESETS: [string, string, number][] = [
  ['#f97316', '#ec4899', 135],
  ['#3b82f6', '#8b5cf6', 135],
  ['#22c55e', '#3b82f6', 135],
  ['#f97316', '#eab308', 90],
  ['#ec4899', '#8b5cf6', 135],
  ['#0f172a', '#1e3a5f', 135],
  ['#18181b', '#3f3f46', 180],
  ['#7c2d12', '#4a1942', 135],
]

const EMOJI_PRESETS = ['⭐', '🔥', '💎', '🌊', '🌸', '🎯', '⚡', '🦋', '🌙', '✨', '🎮', '🏆']

// ─── ColorSwatch: цветной квадрат + попап с ColorPicker ─────────────────────
function ColorSwatchPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="size-8 rounded-lg border-2 border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[--accent-brand]"
        style={{ background: value }}
        title={label}
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-3 shadow-xl">
          <ColorPicker value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

function gradientStyle(g: [string, string, number]): React.CSSProperties {
  return { background: `linear-gradient(${g[2]}deg, ${g[0]}, ${g[1]})` }
}

export function bannerStyle(config: BannerConfig | null): React.CSSProperties {
  if (!config) return { background: 'oklch(0.15 0 0)' }
  if (config.type === 'solid') return { background: config.color ?? '#18181b' }
  if (config.type === 'gradient' && config.gradient) return gradientStyle(config.gradient)
  if (config.type === 'emoji') {
    if (config.bgGradient) return gradientStyle(config.bgGradient)
    return { background: config.bg ?? '#18181b' }
  }
  return { background: 'oklch(0.15 0 0)' }
}

type Props = {
  value: BannerConfig | null
  onChange: (cfg: BannerConfig) => void
}

export function BannerEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<'solid' | 'gradient' | 'emoji'>(value?.type ?? 'solid')
  const [customColor, setCustomColor] = useState(value?.color ?? '#18181b')
  const [gradFrom, setGradFrom] = useState(value?.gradient?.[0] ?? '#f97316')
  const [gradTo, setGradTo] = useState(value?.gradient?.[1] ?? '#ec4899')
  const [gradAngle, setGradAngle] = useState(value?.gradient?.[2] ?? 135)
  const [emoji, setEmoji] = useState(value?.emoji ?? '⭐')
  const [emojiOpacity, setEmojiOpacity] = useState(value?.emojiOpacity ?? 50)
  const [emojiBg, setEmojiBg] = useState(value?.bg ?? '#18181b')
  const [emojiBgGrad, setEmojiBgGrad] = useState<[string, string, number] | null>(value?.bgGradient ?? null)
  const [emojiBgTab, setEmojiBgTab] = useState<'color' | 'gradient'>(value?.bgGradient ? 'gradient' : 'color')

  function emit(cfg: BannerConfig) { onChange(cfg) }

  const tabs = [
    { id: 'solid' as const, label: 'Цвет' },
    { id: 'gradient' as const, label: 'Градиент' },
    { id: 'emoji' as const, label: 'Эмодзи' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={[
              'flex-1 rounded-lg py-1.5 text-xs font-medium transition-all',
              tab === t.id ? 'bg-[--accent-brand] text-black' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'solid' && (
        <div className="space-y-3">
          <div className="grid grid-cols-8 gap-1.5">
            {SOLID_PRESETS.map(c => (
              <button key={c} type="button"
                onClick={() => { setCustomColor(c); emit({ type: 'solid', color: c }) }}
                className="relative aspect-square rounded-lg transition-transform hover:scale-110"
                style={{ background: c }}>
                {value?.type === 'solid' && value.color === c && (
                  <Check className="absolute inset-0 m-auto size-3 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ColorSwatchPicker value={customColor} onChange={c => { setCustomColor(c); emit({ type: 'solid', color: c }) }} label="Свой цвет" />
            <span className="text-xs text-muted-foreground">Свой цвет</span>
          </div>
        </div>
      )}

      {tab === 'gradient' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENT_PRESETS.map((g, i) => (
              <button key={i} type="button"
                onClick={() => { setGradFrom(g[0]); setGradTo(g[1]); setGradAngle(g[2]); emit({ type: 'gradient', gradient: g }) }}
                className="relative aspect-[2/1] rounded-lg transition-transform hover:scale-105"
                style={gradientStyle(g)}>
                {value?.type === 'gradient' && JSON.stringify(value.gradient) === JSON.stringify(g) && (
                  <Check className="absolute inset-0 m-auto size-3 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ColorSwatchPicker value={gradFrom} onChange={c => { setGradFrom(c); emit({ type: 'gradient', gradient: [c, gradTo, gradAngle] }) }} label="Начало" />
              <div className="h-4 flex-1 rounded-full" style={gradientStyle([gradFrom, gradTo, gradAngle])} />
              <ColorSwatchPicker value={gradTo} onChange={c => { setGradTo(c); emit({ type: 'gradient', gradient: [gradFrom, c, gradAngle] }) }} label="Конец" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs text-muted-foreground">Угол {gradAngle}°</span>
              <input type="range" min={0} max={360} value={gradAngle}
                onChange={e => { setGradAngle(Number(e.target.value)); emit({ type: 'gradient', gradient: [gradFrom, gradTo, Number(e.target.value)] }) }}
                className="flex-1 accent-[--accent-brand]" />
            </div>
          </div>
        </div>
      )}

      {tab === 'emoji' && (
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-1.5">
            {EMOJI_PRESETS.map(e => (
              <button key={e} type="button"
                onClick={() => {
                  setEmoji(e)
                  emit({ type: 'emoji', emoji: e, emojiOpacity, bg: emojiBg, bgGradient: emojiBgGrad ?? undefined })
                }}
                className={[
                  'aspect-square rounded-xl border text-xl transition-all hover:scale-110',
                  emoji === e && value?.type === 'emoji' ? 'border-[--accent-brand] bg-[--accent-brand-muted]' : 'border-border bg-card',
                ].join(' ')}>
                {e}
              </button>
            ))}
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-muted-foreground">Прозрачность {emojiOpacity}%</span>
            <input type="range" min={10} max={100} value={emojiOpacity}
              onChange={e => {
                const v = Number(e.target.value)
                setEmojiOpacity(v)
                emit({ type: 'emoji', emoji, emojiOpacity: v, bg: emojiBg, bgGradient: emojiBgGrad ?? undefined })
              }}
              className="flex-1 accent-[--accent-brand]" />
          </div>

          {/* Bg type */}
          <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
            {(['color', 'gradient'] as const).map(bt => (
              <button key={bt} type="button" onClick={() => setEmojiBgTab(bt)}
                className={[
                  'flex-1 rounded-md py-1 text-xs font-medium transition-all',
                  emojiBgTab === bt ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                ].join(' ')}>
                {bt === 'color' ? 'Цвет фона' : 'Градиент фона'}
              </button>
            ))}
          </div>

          {emojiBgTab === 'color' && (
            <div className="flex items-center gap-2">
              <ColorSwatchPicker value={emojiBg} onChange={c => { setEmojiBg(c); setEmojiBgGrad(null); emit({ type: 'emoji', emoji, emojiOpacity, bg: c }) }} label="Цвет фона" />
              <span className="text-xs text-muted-foreground">Цвет фона</span>
            </div>
          )}

          {emojiBgTab === 'gradient' && (
            <div className="grid grid-cols-4 gap-1.5">
              {GRADIENT_PRESETS.map((g, i) => (
                <button key={i} type="button"
                  onClick={() => {
                    setEmojiBgGrad(g)
                    emit({ type: 'emoji', emoji, emojiOpacity, bgGradient: g })
                  }}
                  className="relative aspect-[2/1] rounded-lg transition-transform hover:scale-105"
                  style={gradientStyle(g)}>
                  {emojiBgGrad && JSON.stringify(emojiBgGrad) === JSON.stringify(g) && (
                    <Check className="absolute inset-0 m-auto size-3 text-white drop-shadow" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Хаотичное расположение эмодзи без наложений (grid + jitter)
export function BannerEmojiPattern({ emoji, opacity = 50 }: { emoji: string; opacity?: number }) {
  const items = useMemo(() => {
    const seed = emoji.codePointAt(0) ?? 42
    const rand = (i: number, offset = 0) => {
      const x = Math.sin(seed * 9301 + i * 49297 + offset * 233) * 43758.5453
      return x - Math.floor(x)
    }
    // Сетка ячеек — заполняем весь баннер
    const cols = 9
    const rows = 4
    const items: { left: number; top: number; size: number; rotate: number }[] = []
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Базовая позиция ячейки + случайное смещение внутри ячейки (±30%)
        const jitterX = (rand(idx, 0) - 0.5) * 0.6
        const jitterY = (rand(idx, 1) - 0.5) * 0.6
        const left = ((c + 0.5) / cols + jitterX / cols) * 100
        const top = ((r + 0.5) / rows + jitterY / rows) * 100
        items.push({
          left: Math.max(2, Math.min(98, left)),
          top: Math.max(2, Math.min(98, top)),
          size: 16 + rand(idx, 2) * 18,
          rotate: rand(idx, 3) * 360,
        })
        idx++
      }
    }
    return items
  }, [emoji])

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none"
      style={{ opacity: opacity / 100 }}>
      {items.map((item, i) => (
        <span key={i} className="absolute leading-none"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            fontSize: item.size,
            transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
          }}>
          {emoji}
        </span>
      ))}
    </div>
  )
}
