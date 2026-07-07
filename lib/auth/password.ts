import 'server-only'
import argon2 from 'argon2'
import bcrypt from 'bcryptjs'

// Пароль — argon2 (более стойкий к GPU-атакам)
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

// Номер телефона — bcrypt (для сравнения без раскрытия номера)
export async function hashPhone(phone: string): Promise<string> {
  return bcrypt.hash(phone, 12)
}

export async function verifyPhone(phone: string, hash: string): Promise<boolean> {
  return bcrypt.compare(phone, hash)
}
