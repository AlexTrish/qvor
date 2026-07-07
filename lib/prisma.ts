import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createPrismaClient() {
  // Используем pg.Pool напрямую — убирает deprecated warning "client.query() when already executing"
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'error' }],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma?: any }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  prisma.$on('query', (e: { duration: number; query: string }) => {
    if (e.duration > 500) {
      console.warn(`[Prisma slow query ${e.duration}ms]`, e.query.slice(0, 120))
    }
  })
}

prisma.$on('error', (e: { message: string }) => {
  console.error('[Prisma error]', e.message)
})
