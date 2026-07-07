'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type Props = {
  src: string
  aspect?: number // ширина/высота, по умолчанию 1 (квадрат)
  outputSize?: number // px, по умолчанию 400
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

export function ImageCropper({ src, aspect = 1, outputSize = 400, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const CROP_SIZE = 280 // px отображаемый размер кропа

  // Загружаем изображение
  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      // Начальный масштаб — вписать изображение в кроп
      const fitScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
      setScale(fitScale)
      setOffset({ x: 0, y: 0 })
      setRotation(0)
    }
    img.src = src
  }, [src])

  // Вычисляем максимальный сдвиг чтобы изображение не выходило за пределы круга
  const clampOffset = useCallback((ox: number, oy: number, s: number, rot: number) => {
    const img = imgRef.current
    if (!img) return { x: ox, y: oy }
    const rad = (rot * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    const rotW = img.width * cos + img.height * sin
    const rotH = img.width * sin + img.height * cos
    const halfW = (rotW * s) / 2
    const halfH = (rotH * s) / 2
    const r = CROP_SIZE / 2
    const maxX = Math.max(0, halfW - r)
    const maxY = Math.max(0, halfH - r)
    return { x: Math.max(-maxX, Math.min(maxX, ox)), y: Math.max(-maxY, Math.min(maxY, oy)) }
  }, [])

  // Рисуем на canvas — только изображение, без overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const s = CROP_SIZE

    ctx.clearRect(0, 0, s, s)
    ctx.save()
    ctx.translate(s / 2 + offset.x, s / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()
  }, [scale, offset, rotation])

  useEffect(() => { draw() }, [draw])

  // Drag
  function onMouseDown(e: React.MouseEvent) {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const raw = {
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    }
    setOffset(clampOffset(raw.x, raw.y, scale, rotation))
  }
  function onMouseUp() { setDragging(false) }

  // Touch drag
  const lastTouch = useRef({ x: 0, y: 0 })
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    lastTouch.current = { x: t.clientX, y: t.clientY }
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (!dragging) return
    const t = e.touches[0]
    const raw = {
      x: dragStart.current.ox + t.clientX - dragStart.current.x,
      y: dragStart.current.oy + t.clientY - dragStart.current.y,
    }
    setOffset(clampOffset(raw.x, raw.y, scale, rotation))
  }

  // Wheel zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const next = Math.max(0.3, Math.min(5, scale - e.deltaY * 0.001))
    setScale(next)
    setOffset(o => clampOffset(o.x, o.y, next, rotation))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const out = document.createElement('canvas')
    out.width = outputSize
    out.height = outputSize
    const ctx = out.getContext('2d')!
    const ratio = outputSize / CROP_SIZE

    ctx.save()
    ctx.translate(outputSize / 2 + offset.x * ratio, outputSize / 2 + offset.y * ratio)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale * ratio, scale * ratio)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()

    // Обрезаем по кругу
    const final = document.createElement('canvas')
    final.width = outputSize
    final.height = outputSize
    const fctx = final.getContext('2d')!
    fctx.beginPath()
    fctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    fctx.clip()
    fctx.drawImage(out, 0, 0)

    onConfirm(final.toDataURL('image/jpeg', 0.9))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-muted-foreground">Перетащите и масштабируйте фото</p>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing select-none"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => setDragging(false)}
        onWheel={onWheel}
      >
        {/* Изображение */}
        <canvas
          ref={canvasRef}
          width={CROP_SIZE}
          height={CROP_SIZE}
          className="absolute inset-0"
        />
        {/* Overlay: затемнение снаружи круга через CSS clip-path */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'rgba(0,0,0,0.55)',
            WebkitMaskImage: `radial-gradient(circle ${CROP_SIZE / 2 - 2}px at 50% 50%, transparent 99%, black 100%)`,
            maskImage: `radial-gradient(circle ${CROP_SIZE / 2 - 2}px at 50% 50%, transparent 99%, black 100%)`,
          }}
        />
        {/* Граница круга */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.7)' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => { const s = Math.max(0.3, scale - 0.1); setScale(s); setOffset(o => clampOffset(o.x, o.y, s, rotation)) }}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ZoomOut className="size-4" strokeWidth={1.5} />
        </button>

        <input type="range" min={0.3} max={5} step={0.01} value={scale}
          onChange={e => { const s = Number(e.target.value); setScale(s); setOffset(o => clampOffset(o.x, o.y, s, rotation)) }}
          className="w-32 accent-[--accent-brand]"
        />

        <button type="button" onClick={() => { const s = Math.min(5, scale + 0.1); setScale(s); setOffset(o => clampOffset(o.x, o.y, s, rotation)) }}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <ZoomIn className="size-4" strokeWidth={1.5} />
        </button>

        <button type="button" onClick={() => { const r = (rotation + 90) % 360; setRotation(r); setOffset(o => clampOffset(o.x, o.y, scale, r)) }}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
          <RotateCw className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium transition-all hover:bg-muted/40">
          <X className="size-4" strokeWidth={2} />
          Отмена
        </button>
        <button type="button" onClick={handleConfirm}
          className="flex items-center gap-2 rounded-xl bg-[--accent-brand] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110">
          <Check className="size-4" strokeWidth={2.5} />
          Применить
        </button>
      </div>
    </div>
  )
}
