'use client'

import {
  ColorPicker as AriaColorPicker,
  ColorArea,
  ColorSlider,
  ColorThumb,
  SliderTrack,
  parseColor,
} from 'react-aria-components'
import { useState, useEffect } from 'react'

type Props = {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: Props) {
  const [color, setColor] = useState(() => {
    try { return parseColor(value) } catch { return parseColor('#18181b') }
  })

  useEffect(() => {
    try { setColor(parseColor(value)) } catch {}
  }, [value])

  function handleChange(c: typeof color) {
    setColor(c)
    onChange(c.toString('hex'))
  }

  return (
    <AriaColorPicker value={color} onChange={handleChange}>
      <div className="space-y-2">
        {/* Saturation/Brightness area */}
        <ColorArea
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
          className="h-36 w-full overflow-hidden rounded-xl border border-border"
        >
          <ColorThumb className="size-4 rounded-full border-2 border-white shadow-md outline-none focus:ring-2 focus:ring-[--accent-brand]" />
        </ColorArea>

        {/* Hue slider */}
        <ColorSlider colorSpace="hsb" channel="hue">
          <SliderTrack className="h-3 w-full overflow-hidden rounded-full border border-border">
            <ColorThumb className="top-1/2 size-4 rounded-full border-2 border-white shadow-md outline-none focus:ring-2 focus:ring-[--accent-brand]" />
          </SliderTrack>
        </ColorSlider>

        {/* Hex input + preview */}
        <div className="flex items-center gap-2">
          <div
            className="size-8 shrink-0 rounded-lg border border-border"
            style={{ background: color.toString('hex') }}
          />
          <input
            type="text"
            value={color.toString('hex')}
            onChange={e => {
              const v = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                try { handleChange(parseColor(v)) } catch {}
              }
            }}
            className="h-8 flex-1 rounded-lg border border-border bg-background px-2 font-mono text-xs focus:border-[--accent-brand] focus:outline-none focus:ring-2 focus:ring-[--accent-brand]/20"
            maxLength={7}
            spellCheck={false}
          />
        </div>
      </div>
    </AriaColorPicker>
  )
}
