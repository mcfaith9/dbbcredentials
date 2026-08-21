import type { VaultItem, User, AppSettings, Category, EncryptedBackupPayload, ImportConflictStrategy } from '@/types'
import { hashPassword, encryptVault, decryptVault } from './crypto'

const STORAGE_KEYS = {
  USER: 'dbb_local_user',
  ITEMS: 'dbb_vault_items',
  CATEGORIES: 'dbb_categories',
  SETTINGS: 'dbb_app_settings',
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'it_infra', name: 'IT & Infrastructure', icon: 'Server', is_custom: false },
  { id: 'operations', name: 'Operations', icon: 'Briefcase', is_custom: false },
  { id: 'marketing_social', name: 'Marketing & Social', icon: 'Share2', is_custom: false },
  { id: 'dev_eng', name: 'Development & Engineering', icon: 'Code', is_custom: false },
  { id: 'security_access', name: 'Security & Access', icon: 'Shield', is_custom: false },
  { id: 'executive_admin', name: 'Executive & Admin', icon: 'Building', is_custom: false },
  { id: 'general', name: 'General', icon: 'Folder', is_custom: false },
]

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  theme: 'system',
  showPasswordsByDefault: false,
  requirePasswordForReveal: false,
}

// Initial sample seed items for first-time launch - Company-only records
const INITIAL_VAULT_ITEMS: VaultItem[] = [
]

// Helper to automatically derive a clean, meaningful record name from specific credential fields
export function deriveItemName(item: Partial<VaultItem>): string {
  if (item.name && item.name.trim()) return item.name.trim()

  switch (item.type) {
    case 'email_account':
      return item.email || (item.provider ? `${item.provider} Email` : 'Email Account')
    case 'pc_computer':
      return item.hostname || (item.operating_system ? `${item.operating_system} PC` : 'Workstation PC')
    case 'domain':
      return item.domain_name || 'Domain Record'
    case 'wifi':
      return item.ssid || 'Wi-Fi Network'
    case 'software_license':
      return item.software_name || (item.vendor ? `${item.vendor} License` : 'Software License')
    case 'social_account':
      if (item.platform) {
        return item.username ? `${item.platform} (${item.username})` : item.platform
      }
      return item.username || 'Social Account'
    case 'company_account':
      if (item.provider) {
        return item.account_id ? `${item.provider} (${item.account_id})` : item.provider
      }
      return item.account_id || 'Company Account'
    case 'server':
      return item.hostname || item.server_url || 'Server Host'
    case 'hosting':
      return item.provider || item.dashboard_url || 'Hosting Service'
    case 'identity':
      return item.full_name || item.name || item.position || (item.dmbb_id ? `Employee ${item.dmbb_id}` : 'Employee Profile')
    case 'note':
      if (item.content) {
        const firstLine = item.content.trim().split('\n')[0].replace(/^[#\s*-_]+/, '').trim()
        if (firstLine) return firstLine.slice(0, 45)
      }
      return 'Secure Note'
    case 'password':
    default:
      if (item.website_url) {
        try {
          const url = new URL(item.website_url.startsWith('http') ? item.website_url : `https://${item.website_url}`)
          return url.hostname.replace(/^www\./, '')
        } catch {
          return item.website_url
        }
      }
      return item.username || item.email || 'Login Credential'
  }
}

export class LocalStorageService {
  // Initialize user & database if not present
  static async initializeDatabase(): Promise<User> {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER)
    let userObj: User | null = null

    if (rawUser) {
      try {
        userObj = JSON.parse(rawUser)
      } catch (e) {
        console.error('Failed to parse user from local database, re-initializing.', e)
      }
    }

    if (!userObj) {
      // Default credentials: username = "dbbadmin", password = "ilovedbb"
      const { hash, salt } = await hashPassword('ilovedbb')
      userObj = {
        id: 'usr_default_admin',
        username: 'dbbadmin',
        password_hash: hash,
        salt: salt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userObj))
    }

    // Initialize or migrate items
    const rawItems = localStorage.getItem(STORAGE_KEYS.ITEMS)
    if (!rawItems) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_VAULT_ITEMS))
    } else {
      // Migrate existing items to remove 'Personal' references
      try {
        const parsed: VaultItem[] = JSON.parse(rawItems)
        let changed = false
        const migrated = parsed.map((item) => {
          if (item.category === 'Personal') {
            changed = true
            return { ...item, category: 'General', company: item.company || 'DBB' }
          }
          if (!item.company) {
            changed = true
            return { ...item, company: 'DBB' }
          }
          return item
        })
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(migrated))
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_VAULT_ITEMS))
      }
    }

    // Initialize or migrate categories
    const rawCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!rawCats) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
    } else {
      try {
        const parsedCats: Category[] = JSON.parse(rawCats)
        const filtered = parsedCats.filter((c) => c.name.toLowerCase() !== 'personal')
        if (filtered.length !== parsedCats.length) {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered))
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
      }
    }

    // Initialize settings if missing
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
    }

    return userObj
  }

  // Get current user
  static getUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER)
    return raw ? JSON.parse(raw) : null
  }

  // Update master password
  static async updateUserPassword(newPassword: string): Promise<User> {
    const current = this.getUser()
    if (!current) throw new Error('No user found in local database')

    const { hash, salt } = await hashPassword(newPassword)
    const updated: User = {
      ...current,
      password_hash: hash,
      salt: salt,
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated))
    return updated
  }

  // Get all items
  static getItems(): VaultItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  // Save all items
  static saveItems(items: VaultItem[]) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items))
  }

  // Add or update item
  static upsertItem(item: Partial<VaultItem> & { type: VaultItem['type']; name?: string }): VaultItem {
    const items = this.getItems()
    const now = new Date().toISOString()
    const resolvedName = deriveItemName(item)

    if (item.id) {
      const index = items.findIndex((i) => i.id === item.id)
      if (index !== -1) {
        const updated: VaultItem = {
          ...items[index],
          ...item,
          name: resolvedName,
          company: item.company || items[index].company || 'DBB',
          updated_at: now,
        }
        items[index] = updated
        this.saveItems(items)
        return updated
      }
    }

    const newItem: VaultItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: item.type,
      name: resolvedName,
      category: item.category || 'General',
      favorite: !!item.favorite,
      tags: item.tags || [],
      notes: item.notes || '',
      is_trash: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,

      // Company Organization
      company: item.company || 'DBB',
      department: item.department || '',
      team: item.team || '',
      assigned_to: item.assigned_to || '',
      location: item.location || '',

      // General / Login
      username: item.username || '',
      email: item.email || '',
      password: item.password || '',
      website_url: item.website_url || '',
      account_id: item.account_id || '',

      // Email Account
      provider: item.provider || '',
      login_url: item.login_url || '',
      recovery_email: item.recovery_email || '',
      recovery_phone: item.recovery_phone || '',
      imap_server: item.imap_server || '',
      imap_port: item.imap_port || '',
      smtp_server: item.smtp_server || '',
      smtp_port: item.smtp_port || '',
      security_encryption: item.security_encryption || '',
      app_password: item.app_password || '',
      two_factor_method: item.two_factor_method || '',

      // Social Account
      platform: item.platform || '',
      profile_url: item.profile_url || '',

      // Company Account
      role: item.role || '',
      access_level: item.access_level || '',

      // PC / Computer
      hostname: item.hostname || '',
      pin: item.pin || '',
      operating_system: item.operating_system || '',
      ip_address: item.ip_address || '',
      mac_address: item.mac_address || '',
      device_type: item.device_type || '',
      admin_account: item.admin_account || '',
      rdp_enabled: item.rdp_enabled ?? false,
      rdp_port: item.rdp_port || '',
      remote_access_url: item.remote_access_url || '',

      // Server
      port: item.port || '',
      protocol: item.protocol || '',
      server_url: item.server_url || '',
      environment: item.environment || 'Production',

      // Wi-Fi
      ssid: item.ssid || '',
      security_type: item.security_type || '',
      router_ip: item.router_ip || '',
      router_username: item.router_username || '',
      router_password: item.router_password || '',

      // Domain
      domain_name: item.domain_name || '',
      registrar: item.registrar || '',
      nameservers: item.nameservers || '',
      registration_date: item.registration_date || '',
      expiration_date: item.expiration_date || '',
      auto_renewal: item.auto_renewal ?? true,

      // Hosting
      dashboard_url: item.dashboard_url || '',
      server_ip: item.server_ip || '',
      ftp_host: item.ftp_host || '',
      ftp_username: item.ftp_username || '',
      ftp_password: item.ftp_password || '',
      control_panel: item.control_panel || '',

      // Software License
      software_name: item.software_name || '',
      vendor: item.vendor || '',
      license_key: item.license_key || '',
      license_type: item.license_type || '',
      purchase_date: item.purchase_date || '',
      seats_count: item.seats_count || '',
      download_url: item.download_url || '',

      // Note
      content: item.content || '',

      // Identity / Employee specific
      full_name: item.full_name || '',
      position: item.position || '',
      contract: item.contract || 'Regular',
      status: item.status || 'Active',
      sss_no: item.sss_no || '',
      hdmf_no: item.hdmf_no || item.pagibig_no || '',
      pagibig_no: item.pagibig_no || item.hdmf_no || '',
      phic_no: item.phic_no || item.philhealth_no || '',
      philhealth_no: item.philhealth_no || item.phic_no || '',
      tin_no: item.tin_no || '',
      birthdate: item.birthdate || '',
      address: item.address || item.office_address || '',
      office_address: item.office_address || item.address || '',
      dmbb_id: item.dmbb_id || item.employee_id || '',
      employee_id: item.employee_id || item.dmbb_id || '',
      contact_no: item.contact_no || item.work_phone || item.phone || '',
      work_phone: item.work_phone || item.contact_no || item.phone || '',
      phone: item.phone || item.contact_no || '',
      work_email: item.work_email || '',
      emergency_contact: item.emergency_contact || '',
    }

    items.unshift(newItem)
    this.saveItems(items)
    return newItem
  }

  // Move item to trash
  static moveToTrash(id: string): boolean {
    const items = this.getItems()
    const index = items.findIndex((i) => i.id === id)
    if (index === -1) return false

    items[index].is_trash = true
    items[index].deleted_at = new Date().toISOString()
    items[index].updated_at = new Date().toISOString()
    this.saveItems(items)
    return true
  }

  // Restore item from trash
  static restoreFromTrash(id: string): boolean {
    const items = this.getItems()
    const index = items.findIndex((i) => i.id === id)
    if (index === -1) return false

    items[index].is_trash = false
    items[index].deleted_at = null
    items[index].updated_at = new Date().toISOString()
    this.saveItems(items)
    return true
  }

  // Permanently delete item
  static permanentlyDelete(id: string): boolean {
    const items = this.getItems()
    const filtered = items.filter((i) => i.id !== id)
    if (filtered.length === items.length) return false
    this.saveItems(filtered)
    return true
  }

  // Empty trash
  static emptyTrash(): number {
    const items = this.getItems()
    const active = items.filter((i) => !i.is_trash)
    const deletedCount = items.length - active.length
    this.saveItems(active)
    return deletedCount
  }

  // Toggle favorite
  static toggleFavorite(id: string): boolean {
    const items = this.getItems()
    const index = items.findIndex((i) => i.id === id)
    if (index === -1) return false

    items[index].favorite = !items[index].favorite
    items[index].updated_at = new Date().toISOString()
    this.saveItems(items)
    return items[index].favorite
  }

  // Categories
  static getCategories(): Category[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!raw) return DEFAULT_CATEGORIES
    try {
      const cats: Category[] = JSON.parse(raw)
      return cats.filter((c) => c.name.toLowerCase() !== 'personal')
    } catch {
      return DEFAULT_CATEGORIES
    }
  }

  static addCategory(name: string): Category {
    const categories = this.getCategories()
    const cleanName = name.trim()
    const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())
    if (existing) return existing

    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: cleanName,
      icon: 'Tag',
      is_custom: true,
    }
    categories.push(newCat)
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
    return newCat
  }

  static deleteCategory(id: string): boolean {
    const categories = this.getCategories()
    const filtered = categories.filter((c) => c.id !== id || !c.is_custom)
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered))
    return true
  }

  // Settings
  static getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (!raw) return DEFAULT_SETTINGS
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  }

  static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
    return updated
  }

  // Export full vault as JSON object
  static exportVaultData(): {
    format: string
    version: number
    exportedAt: string
    items: VaultItem[]
    categories: Category[]
    settings: AppSettings
  } {
    return {
      format: 'dbb-company-credential-vault',
      version: 1,
      exportedAt: new Date().toISOString(),
      items: this.getItems(),
      categories: this.getCategories(),
      settings: this.getSettings(),
    }
  }

  // Create Encrypted Backup Payload
  static async exportEncryptedBackup(passphrase: string): Promise<EncryptedBackupPayload> {
    const rawData = this.exportVaultData()
    const jsonStr = JSON.stringify(rawData)
    const encryptedPayload = await encryptVault(jsonStr, passphrase)

    return {
      format: 'dbb-company-credential-vault',
      version: 1,
      createdAt: new Date().toISOString(),
      encrypted: true,
      payload: encryptedPayload,
    }
  }

  // Decrypt and Parse Backup Payload
  static async decryptBackupPayload(backupContent: string, passphrase?: string): Promise<{
    format: string
    version: number
    createdAt?: string
    exportedAt?: string
    items: VaultItem[]
    categories?: Category[]
    settings?: AppSettings
  }> {
    let parsed: any
    try {
      parsed = JSON.parse(backupContent)
    } catch {
      throw new Error('Invalid JSON file format.')
    }

    if (parsed.encrypted || (parsed.version && parsed.salt && parsed.iv && parsed.data)) {
      if (!passphrase) {
        throw new Error('Password required to decrypt this backup file.')
      }

      const rawCipher = parsed.payload || backupContent
      const decryptedStr = await decryptVault(typeof rawCipher === 'string' ? rawCipher : JSON.stringify(rawCipher), passphrase)
      try {
        return JSON.parse(decryptedStr)
      } catch {
        throw new Error('Decrypted content is not valid JSON.')
      }
    }

    return parsed
  }

  // Import vault data with conflict resolution strategy
  static importVaultData(
    data: {
      items?: VaultItem[]
      categories?: Category[]
      settings?: AppSettings
    },
    strategy: ImportConflictStrategy = 'update'
  ): { importedCount: number; updatedCount: number; skippedCount: number } {
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid vault export format: Missing items array.')
    }

    const currentItems = this.getItems()
    const itemMap = new Map<string, VaultItem>()
    currentItems.forEach((i) => itemMap.set(i.id, i))

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    data.items.forEach((item) => {
      if (!item || !item.name || !item.type) return

      const existing = itemMap.get(item.id)

      if (existing) {
        if (strategy === 'skip') {
          skippedCount++
          return
        } else if (strategy === 'new') {
          // generate new ID
          const newId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const copy: VaultItem = { ...item, id: newId, name: `${item.name} (Imported)` }
          itemMap.set(newId, copy)
          importedCount++
          return
        } else {
          // 'update' or default
          itemMap.set(item.id, { ...existing, ...item, updated_at: new Date().toISOString() })
          updatedCount++
          return
        }
      }

      // New item not present currently
      itemMap.set(item.id, item)
      importedCount++
    })

    this.saveItems(Array.from(itemMap.values()))

    if (Array.isArray(data.categories)) {
      const currentCats = this.getCategories()
      const catMap = new Map<string, Category>()
      currentCats.forEach((c) => catMap.set(c.name.toLowerCase(), c))
      data.categories.forEach((c) => {
        if (c.name && c.name.toLowerCase() !== 'personal' && !catMap.has(c.name.toLowerCase())) {
          catMap.set(c.name.toLowerCase(), c)
        }
      })
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(Array.from(catMap.values())))
    }

    return { importedCount, updatedCount, skippedCount }
  }

  // Reset vault to defaults
  static resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_VAULT_ITEMS))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
  }
}

