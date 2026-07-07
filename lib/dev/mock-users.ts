import 'server-only'

// Используется только при NODE_ENV=development + MOCK_AUTH=true
// Пароль для всех: password123
// OTP для всех: 123456

export type MockUser = {
  id: string
  phone: string
  password: string
  blob: string
  blobRecovery: string
  recoveryHint: string
  publicKey: string
  username: string
  role: 'USER' | 'SUPER_ADMIN'
}

export const MOCK_OTP = '123456'

export const mockUsers: MockUser[] = [
  {
    id: 'mock-user-001',
    phone: '79991234567',
    password: 'password123',
    blob: 'mock_blob_user_001',
    blobRecovery: 'mock_blob_recovery_user_001',
    recoveryHint: 'Любимый питомец',
    publicKey: 'mock_public_key_user_001',
    username: 'user_dev',
    role: 'USER',
  },
  {
    id: 'mock-admin-001',
    phone: '79990000000',
    password: 'password123',
    blob: 'mock_blob_admin_001',
    blobRecovery: 'mock_blob_recovery_admin_001',
    recoveryHint: 'Первая школа',
    publicKey: 'mock_public_key_admin_001',
    username: 'admin_dev',
    role: 'SUPER_ADMIN',
  },
]

export function findMockUserByPhone(phone: string): MockUser | null {
  const normalized = phone.replace(/^\+/, '')
  return mockUsers.find((u) => u.phone === normalized) ?? null
}

export function isMockEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.MOCK_AUTH === 'true'
}
