export type VaultItemType =
  | 'password'
  | 'email_account'
  | 'social_account'
  | 'company_account'
  | 'pc_computer'
  | 'server'
  | 'wifi'
  | 'domain'
  | 'hosting'
  | 'software_license'
  | 'note'
  | 'identity'
  | 'other'

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

  // Company Organization
  company?: string
  department?: string
  team?: string
  assigned_to?: string
  location?: string

  // General & Login / Account Fields
  username?: string
  email?: string
  password?: string
  website_url?: string
  account_id?: string

  // Email Account specific
  provider?: string
  login_url?: string
  recovery_email?: string
  recovery_phone?: string
  imap_server?: string
  imap_port?: number | string
  smtp_server?: string
  smtp_port?: number | string
  security_encryption?: string
  app_password?: string
  two_factor_method?: string
  two_factor_enabled?: boolean

  // Social Account specific
  platform?: string
  profile_url?: string

  // Company Account specific
  role?: string
  access_level?: string

  // PC / Computer specific
  hostname?: string
  pin?: string
  operating_system?: string
  ip_address?: string
  mac_address?: string
  device_type?: string
  admin_account?: string
  rdp_enabled?: boolean
  rdp_port?: number | string
  remote_access_url?: string

  // Server specific
  port?: number | string
  protocol?: string
  server_url?: string
  environment?: 'Development' | 'Testing' | 'Staging' | 'Production' | 'Other' | string

  // Wi-Fi specific
  ssid?: string
  security_type?: string
  router_ip?: string
  router_username?: string
  router_password?: string

  // Domain specific
  domain_name?: string
  registrar?: string
  nameservers?: string
  registration_date?: string
  expiration_date?: string
  auto_renewal?: boolean
  auto_renew?: boolean

  // Hosting specific
  dashboard_url?: string
  server_ip?: string
  ftp_host?: string
  ftp_username?: string
  ftp_password?: string
  control_panel?: string

  // Software License specific
  software_name?: string
  vendor?: string
  license_key?: string
  license_type?: string
  purchase_date?: string
  seats_count?: number | string
  seat_count?: number | string
  download_url?: string

  // Note specific
  content?: string

  // Identity / Employee specific
  full_name?: string
  position?: string
  department?: string
  contract?: string
  status?: string
  sss_no?: string
  hdmf_no?: string
  pagibig_no?: string
  phic_no?: string
  philhealth_no?: string
  tin_no?: string
  birthdate?: string
  address?: string
  office_address?: string
  dmbb_id?: string
  employee_id?: string
  contact_no?: string
  work_phone?: string
  phone?: string
  work_email?: string
  emergency_contact?: string
}

export * from './employee'

export type VaultNavFilter =
  | 'dashboard'
  | 'all'
  | 'passwords'
  | 'email_accounts'
  | 'social_accounts'
  | 'company_accounts'
  | 'pc_computers'
  | 'servers'
  | 'wifi'
  | 'domains'
  | 'hosting'
  | 'software_licenses'
  | 'notes'
  | 'identities'
  | 'categories'
  | 'tags'
  | 'favorites'
  | 'trash'
  | 'backup'
  | 'settings'
  | 'security'

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
  expiringDomains: VaultItem[]
  expiringLicenses: VaultItem[]
}

export interface EncryptedBackupPayload {
  format: 'dbb-company-credential-vault'
  version: number
  createdAt: string
  encrypted: boolean
  payload: string
}

export type ImportConflictStrategy = 'new' | 'update' | 'skip' | 'review'

