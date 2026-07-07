import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Стрипаем HTML-теги из строки (server-safe, без DOMParser) */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}
