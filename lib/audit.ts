import { prisma } from '@/lib/prisma'

type AuditAction =
  | 'user.ban' | 'user.unban' | 'user.delete' | 'user.role_change'
  | 'channel.delete' | 'message.delete'
  | 'broadcast.send'
  | 'report.resolved' | 'report.dismissed'

export async function writeAudit(
  actorId: string,
  actorName: string | null,
  action: AuditAction,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_logs (actor_id, actor_name, action, target_type, target_id, meta)
      VALUES (
        ${actorId}::uuid,
        ${actorName},
        ${action},
        ${targetType ?? null},
        ${targetId ?? null},
        ${meta ? JSON.stringify(meta) : null}::jsonb
      )
    `
  } catch {
    // Таблица не существует — создаём и повторяем
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID NOT NULL,
          actor_name TEXT,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          meta JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await prisma.$executeRaw`
        INSERT INTO audit_logs (actor_id, actor_name, action, target_type, target_id, meta)
        VALUES (
          ${actorId}::uuid,
          ${actorName},
          ${action},
          ${targetType ?? null},
          ${targetId ?? null},
          ${meta ? JSON.stringify(meta) : null}::jsonb
        )
      `
    } catch { /* silent */ }
  }
}
