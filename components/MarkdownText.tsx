'use client'

import { useMemo } from 'react'

// Экранируем HTML чтобы не было XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Парсим markdown в безопасный HTML
function parseMarkdown(raw: string): string {
  // Сначала экранируем весь HTML
  let text = escapeHtml(raw)

  // Блочный код ```...```
  text = text.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<code class="block-code">${code.trim()}</code>`
  )

  // Инлайн код `...`
  text = text.replace(/`([^`\n]+)`/g, (_, code) =>
    `<code class="inline-code">${code}</code>`
  )

  // Жирный **text** или __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Курсив *text* или _text_ (не внутри слов)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  text = text.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')

  // Зачёркнутый ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>')

  // Ссылки [text](url) — только https/http
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
  )

  // Хештеги #tag — кликабельные ссылки
  text = text.replace(/(^|\s)(#[\w\u0400-\u04FF]{1,50})/g,
    '$1<a href="/search?q=$2" class="md-hashtag">$2</a>'
  )

  // Упоминания @username
  text = text.replace(/(^|\s)(@[a-zA-Z][a-zA-Z0-9_]{2,19})/g,
    '$1<a href="/$2" class="md-mention">$2</a>'
  )

  // Переносы строк
  text = text.replace(/\n/g, '<br />')

  return text
}

type Props = {
  text: string
  className?: string
  isOwn?: boolean
}

export function MarkdownText({ text, className, isOwn }: Props) {
  const html = useMemo(() => parseMarkdown(text), [text])

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        // Стили для markdown элементов
      }}
    />
  )
}
