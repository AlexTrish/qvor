/**
 * Сжимает base64 dataURL изображения через canvas.
 * Уменьшает размер до maxSize px и применяет JPEG quality.
 */
export async function compressImage(
  dataUrl: string,
  options: {
    maxSize?: number   // макс. сторона в px (default 1200)
    quality?: number   // JPEG quality 0-1 (default 0.82)
    format?: 'jpeg' | 'webp'
  } = {},
): Promise<string> {
  const { maxSize = 1200, quality = 0.82, format = 'jpeg' } = options

  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      let { width, height } = img

      // Масштабируем если больше maxSize
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL(`image/${format}`, quality))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Сжимает аватар: квадрат 400px, JPEG 85%
 */
export function compressAvatar(dataUrl: string): Promise<string> {
  return compressImage(dataUrl, { maxSize: 400, quality: 0.85 })
}

/**
 * Сжимает фото для стены: макс maxSize px, JPEG 82%
 */
export function compressPhoto(dataUrl: string, maxSize = 1200): Promise<string> {
  return compressImage(dataUrl, { maxSize, quality: 0.82 })
}

/**
 * Возвращает размер base64 строки в KB
 */
export function base64SizeKb(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? dataUrl
  return Math.round((base64.length * 3) / 4 / 1024)
}
