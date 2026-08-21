import type { VaultItem, User, AppSettings, Category } from '@/types'
import { hashPassword } from './crypto'

const STORAGE_KEYS = {
  USER: 'dbb_local_user',
  ITEMS: 'dbb_vault_items',
  CATEGORIES: 'dbb_categories',
  SETTINGS: 'dbb_app_settings',
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'personal', name: 'Personal', icon: 'User', is_custom: false },
  { id: 'work', name: 'Work', icon: 'Briefcase', is_custom: false },
  { id: 'finance', name: 'Finance', icon: 'DollarSign', is_custom: false },
  { id: 'social', name: 'Social', icon: 'Share2', is_custom: false },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', is_custom: false },
  { id: 'development', name: 'Development', icon: 'Code', is_custom: false },
  { id: 'email', name: 'Email', icon: 'Mail', is_custom: false },
  { id: 'other', name: 'Other', icon: 'Folder', is_custom: false },
]

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  theme: 'system',
  showPasswordsByDefault: false,
  requirePasswordForReveal: false,
}

// Initial sample seed items for first-time launch
const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: 'item-github',
    type: 'password',
    name: 'GitHub Enterprise',
    category: 'Development',
    favorite: true,
    tags: ['work', 'git', 'mfa'],
    notes: '2FA token backup stored in offline hardware key.',
    is_trash: false,
    deleted_at: null,
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    username: 'dbadmin@github.internal',
    email: 'dbadmin@github.internal',
    password: 'Kx9#mP$2vL!9qZ@8wR',
    website_url: 'https://github.com',
  },
  {
    id: 'item-aws',
    type: 'password',
    name: 'AWS Cloud Console',
    category: 'Work',
    favorite: true,
    tags: ['cloud', 'infrastructure', 'root'],
    notes: 'Root account access with YubiKey hardware token.',
    is_trash: false,
    deleted_at: null,
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 110 * 86400000).toISOString(),
    username: 'ops-root@dbb.corp',
    email: 'ops-root@dbb.corp',
    password: 'P@ssw0rd123!', // weak & old password for security audit demonstration
    website_url: 'https://aws.amazon.com/console',
  },
  {
    id: 'item-google',
    type: 'password',
    name: 'Primary Work Google Workspace',
    category: 'Email',
    favorite: false,
    tags: ['email', 'gsuite'],
    notes: 'Corporate email and document drive.',
    is_trash: false,
    deleted_at: null,
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    username: 'admin@dbb-industries.local',
    email: 'admin@dbb-industries.local',
    password: 'Kx9#mP$2vL!9qZ@8wR', // Reused password for audit demonstration
    website_url: 'https://mail.google.com',
  },
  {
    id: 'item-ssh-note',
    type: 'note',
    name: 'Production Bastion SSH Keys & Config',
    category: 'Development',
    favorite: true,
    tags: ['ssh', 'server', 'secret'],
    notes: 'Do not commit to public repositories.',
    is_trash: false,
    deleted_at: null,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    content: `Host bastion.prod.dbb
  HostName 192.168.10.45
  User deployer
  Port 2222
  IdentityFile ~/.ssh/id_ed25519_bastion
  StrictHostKeyChecking yes`,
  },
  {
    id: 'item-identity-admin',
    type: 'identity',
    name: 'DBB System Administrator Profile',
    category: 'Personal',
    favorite: false,
    tags: ['identity', 'admin'],
    notes: 'Official primary contact records.',
    is_trash: false,
    deleted_at: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    full_name: 'DBB System Administrator',
    email: 'dbadmin@dbb-industries.local',
    phone: '+1 (555) 492-0199',
    address: '100 Innovation Way, Suite 400, Tech Park, CA 94025',
    birthday: '1990-05-15',
    company: 'DBB Industries Ltd.',
  },
]

export class LocalStorageService {
  // Initialize user & database if not present
  static async initializeDatabase(): Promise<User> {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER)
    if (rawUser) {
      try {
        return JSON.parse(rawUser)
      } catch (e) {
        console.error('Failed to parse user from local database, re-initializing.', e)
      }
    }

    // Default credentials: username = "dbadmin", password = "ilovedbb"
    const { hash, salt } = await hashPassword('ilovedbb')
    const defaultUser: User = {
      id: 'usr_default_admin',
      username: 'dbadmin',
      password_hash: hash,
      salt: salt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser))

    // Initialize items if missing
    if (!localStorage.getItem(STORAGE_KEYS.ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_VAULT_ITEMS))
    }

    // Initialize categories if missing
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
    }

    // Initialize settings if missing
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
    }

    return defaultUser
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
  static upsertItem(item: Partial<VaultItem> & { name: string; type: VaultItem['type'] }): VaultItem {
    const items = this.getItems()
    const now = new Date().toISOString()

    if (item.id) {
      const index = items.findIndex((i) => i.id === item.id)
      if (index !== -1) {
        const updated: VaultItem = {
          ...items[index],
          ...item,
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
      name: item.name,
      category: item.category || 'Personal',
      favorite: !!item.favorite,
      tags: item.tags || [],
      notes: item.notes || '',
      is_trash: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      username: item.username || '',
      email: item.email || '',
      password: item.password || '',
      website_url: item.website_url || '',
      content: item.content || '',
      full_name: item.full_name || '',
      phone: item.phone || '',
      address: item.address || '',
      birthday: item.birthday || '',
      company: item.company || '',
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
      return JSON.parse(raw)
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
    version: number
    exportedAt: string
    items: VaultItem[]
    categories: Category[]
    settings: AppSettings
  } {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: this.getItems(),
      categories: this.getCategories(),
      settings: this.getSettings(),
    }
  }

  // Import vault data
  static importVaultData(data: {
    items?: VaultItem[]
    categories?: Category[]
    settings?: AppSettings
  }): { importedCount: number } {
    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid vault export format')
    }

    const currentItems = this.getItems()
    const itemMap = new Map<string, VaultItem>()

    // Retain existing items
    currentItems.forEach((i) => itemMap.set(i.id, i))

    // Merge or append imported items
    let count = 0
    data.items.forEach((item) => {
      if (item && item.id && item.name && item.type) {
        itemMap.set(item.id, item)
        count++
      }
    })

    this.saveItems(Array.from(itemMap.values()))

    if (Array.isArray(data.categories)) {
      const currentCats = this.getCategories()
      const catMap = new Map<string, Category>()
      currentCats.forEach((c) => catMap.set(c.name.toLowerCase(), c))
      data.categories.forEach((c) => {
        if (!catMap.has(c.name.toLowerCase())) {
          catMap.set(c.name.toLowerCase(), c)
        }
      })
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(Array.from(catMap.values())))
    }

    return { importedCount: count }
  }

  // Reset vault to defaults
  static resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_VAULT_ITEMS))
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
  }
}
