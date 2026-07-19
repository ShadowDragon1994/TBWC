import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export function createSecretService(key: Buffer) {
  if (key.length !== 32) throw new Error('AI encryption key must be 32 bytes')
  return {
    encrypt(value: string) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
      return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`
    },
    decrypt(value: string) {
      const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64'))
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    },
  }
}
