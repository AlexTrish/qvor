import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/middleware/auth'
import { rateLimit } from '@/lib/rate-limit'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const ALLOWED_TYPES: Record<string, string> = {
  // Изображения
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  // Видео
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  // Документы
  'application/pdf': 'file',
  'application/msword': 'file',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file',
  'application/vnd.ms-excel': 'file',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file',
  'text/plain': 'file',
  'application/zip': 'file',
  'application/x-zip-compressed': 'file',
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'api')
  if (limited) return limited

  const user = await auth(request)
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ data: null, error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ data: null, error: 'File too large (max 50MB)' }, { status: 400 })

  const mediaType = ALLOWED_TYPES[file.type]
  if (!mediaType) return NextResponse.json({ data: null, error: 'File type not allowed' }, { status: 400 })

  const ext = extname(file.name) || `.${file.type.split('/')[1]}`
  const filename = `${randomUUID()}${ext}`
  const subdir = mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : 'files'
  const dir = join(process.cwd(), 'public', 'uploads', subdir)

  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(dir, filename), buffer)

  const url = `/api/upload/${subdir}/${filename}`

  return NextResponse.json({
    data: {
      url,
      mediaType,
      mediaName: file.name,
      mediaSize: file.size,
    },
    error: null,
  }, { status: 201 })
}
