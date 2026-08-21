export type VaultItemType = 'password' | 'note' | 'identity'

export interface VaultItem {
  id: string
  type: VaultItemType
  name: string
  category: string
  favorite: boolean
  tags: string[]
  notes: string
  is_trash: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string

  // Password type fields
  username?: string
  email?: string
  password?: string
  website_url?: string

  // Note type fields
  content?: string

  // Identity type fields
  full_name?: string
  phone?: string
  address?: string
  birthday?: string
  company?: string
}

export interface User {
  id: string
  username: string
  password_hash: string
  salt: string
  created_at: string
  updated_at: string
}

export interface AppSettings {
  autoLockMinutes: number // 0 = never, 1, 5, 15, 30, 60
  clipboardClearSeconds: number // 0 = never, 15, 30, 60
  theme: 'dark' | 'light' | 'system'
  showPasswordsByDefault: boolean
  requirePasswordForReveal: boolean
}

export interface Category {
  id: string
  name: string
  icon?: string
  is_custom: boolean
}

export interface PasswordStrength {
  score: number // 0 to 100
  level: 'very-weak' | 'weak' | 'fair' | 'strong' | 'excellent'
  label: string
  entropy: number
  hasLower: boolean
  hasUpper: boolean
  hasNumber: boolean
  hasSymbol: boolean
  isLongEnough: boolean
  feedback: string[]
}

export interface GeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export interface SecurityReport {
  score: number
  totalPasswords: number
  weakCount: number
  reusedCount: number
  oldItemsCount: number
  missingCount: number
  weakItems: VaultItem[]
  reusedItems: { password: string; items: VaultItem[] }[]
  oldItems: VaultItem[]
  missingItems: VaultItem[]
}
