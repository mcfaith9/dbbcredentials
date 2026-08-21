import type { GeneratorOptions, PasswordStrength } from '@/types'

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256
const HASH_ALGO = 'SHA-256'

// Convert ArrayBuffer to Hex String
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Convert Hex String to Uint8Array
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

// Generate random salt
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return bufferToHex(array.buffer)
}

// Derive a cryptographic key using PBKDF2
async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    usage
  )
}

// Hash password with PBKDF2-SHA256
export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const saltHex = existingSalt || generateSalt(16)
  const saltBytes = hexToBuffer(saltHex)

  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    256
  )

  return {
    hash: bufferToHex(derivedBits),
    salt: saltHex,
  }
}

// Verify password against stored hash and salt
export async function verifyPassword(password: string, expectedHash: string, salt: string): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, salt)
    return hash === expectedHash
  } catch (err) {
    console.error('Password verification error:', err)
    return false
  }
}

// AES-256-GCM Encryption for Backups / Sensitive blobs
export async function encryptVault(data: string, masterPassword: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(masterPassword, salt, ['encrypt'])
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    enc.encode(data)
  )

  const payload = {
    version: 1,
    salt: bufferToHex(salt.buffer),
    iv: bufferToHex(iv.buffer),
    data: bufferToHex(encrypted),
    createdAt: new Date().toISOString(),
  }

  return JSON.stringify(payload, null, 2)
}

// AES-256-GCM Decryption for Backups
export async function decryptVault(encryptedJson: string, masterPassword: string): Promise<string> {
  const payload = JSON.parse(encryptedJson)
  if (!payload.salt || !payload.iv || !payload.data) {
    throw new Error('Invalid backup file format')
  }

  const saltBytes = hexToBuffer(payload.salt)
  const ivBytes = hexToBuffer(payload.iv)
  const dataBytes = hexToBuffer(payload.data)

  const key = await deriveKey(masterPassword, saltBytes, ['decrypt'])
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as unknown as BufferSource,
    },
    key,
    dataBytes as unknown as BufferSource
  )

  const dec = new TextDecoder()
  return dec.decode(decrypted)
}

// Cryptographically secure password generator
export function generatePassword(options: GeneratorOptions): string {
  let uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'
  let numberChars = '23456789'
  let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!options.excludeAmbiguous) {
    uppercaseChars += 'I' + 'O'
    lowercaseChars += 'l'
    numberChars += '0' + '1'
  }

  let charset = ''
  const requiredChars: string[] = []

  if (options.lowercase) {
    charset += lowercaseChars
    requiredChars.push(getRandomChar(lowercaseChars))
  }
  if (options.uppercase) {
    charset += uppercaseChars
    requiredChars.push(getRandomChar(uppercaseChars))
  }
  if (options.numbers) {
    charset += numberChars
    requiredChars.push(getRandomChar(numberChars))
  }
  if (options.symbols) {
    charset += symbolChars
    requiredChars.push(getRandomChar(symbolChars))
  }

  if (!charset) {
    charset = lowercaseChars + numberChars
  }

  const remainingLength = Math.max(0, options.length - requiredChars.length)
  const randomChars: string[] = []

  const randomValues = new Uint32Array(remainingLength)
  window.crypto.getRandomValues(randomValues)

  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomValues[i] % charset.length
    randomChars.push(charset[randomIndex])
  }

  // Combine and shuffle
  const allChars = [...requiredChars, ...randomChars]
  return shuffleArray(allChars).join('')
}

function getRandomChar(str: string): string {
  const array = new Uint32Array(1)
  window.crypto.getRandomValues(array)
  return str[array[0] % str.length]
}

function shuffleArray(arr: string[]): string[] {
  const result = [...arr]
  const randomValues = new Uint32Array(result.length)
  window.crypto.getRandomValues(randomValues)

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1)
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

// Password strength calculation
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      level: 'very-weak',
      label: 'Empty',
      entropy: 0,
      hasLower: false,
      hasUpper: false,
      hasNumber: false,
      hasSymbol: false,
      isLongEnough: false,
      feedback: ['Enter a password to evaluate strength.'],
    }
  }

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const isLongEnough = password.length >= 12

  // Pool size calculation for entropy
  let poolSize = 0
  if (hasLower) poolSize += 26
  if (hasUpper) poolSize += 26
  if (hasNumber) poolSize += 10
  if (hasSymbol) poolSize += 33

  const entropy = Math.round(password.length * (Math.log2(poolSize || 1)))

  let score = 0
  const feedback: string[] = []

  // Length points
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 15
  if (password.length >= 20) score += 10

  // Variety points
  let varietyCount = 0
  if (hasLower) varietyCount++
  if (hasUpper) varietyCount++
  if (hasNumber) varietyCount++
  if (hasSymbol) varietyCount++

  score += varietyCount * 8

  // Repetition / penalty checks
  if (/(.)\1{2,}/.test(password)) {
    score -= 15
    feedback.push('Avoid repetitive characters (e.g. "aaa")')
  }
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10
    feedback.push('Add numbers and symbols for better security')
  }
  if (/^[0-9]+$/.test(password)) {
    score -= 20
    feedback.push('All-number passwords are very easy to crack')
  }

  // Common patterns
  if (/123|abc|password|admin|qwerty|ilove/i.test(password)) {
    score -= 20
    feedback.push('Contains easily guessable words or keyboard sequences')
  }

  score = Math.max(5, Math.min(100, score))

  let level: PasswordStrength['level'] = 'very-weak'
  let label = 'Very Weak'

  if (score >= 85) {
    level = 'excellent'
    label = 'Excellent'
  } else if (score >= 70) {
    level = 'strong'
    label = 'Strong'
  } else if (score >= 50) {
    level = 'fair'
    label = 'Fair'
  } else if (score >= 30) {
    level = 'weak'
    label = 'Weak'
  }

  if (!isLongEnough && feedback.length === 0) {
    feedback.push('Use at least 12 characters for better protection')
  }
  if (varietyCount < 3 && feedback.length === 0) {
    feedback.push('Mix letters, numbers, and special symbols')
  }

  return {
    score,
    level,
    label,
    entropy,
    hasLower,
    hasUpper,
    hasNumber,
    hasSymbol,
    isLongEnough,
    feedback,
  }
}
