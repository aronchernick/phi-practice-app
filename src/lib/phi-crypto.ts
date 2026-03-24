import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.PHI_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function encryptPHI(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptPHI(ciphertext: string): string {
  const key = getKey()
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, 16)
  const authTag = data.subarray(16, 32)
  const encrypted = data.subarray(32)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/** Mask a PHI string, showing only the last N characters */
export function maskPHI(value: string, showLast = 4): string {
  if (value.length <= showLast) return '*'.repeat(value.length)
  return '*'.repeat(value.length - showLast) + value.slice(-showLast)
}
