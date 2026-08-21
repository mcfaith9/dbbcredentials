import { ref, computed } from 'vue'
import type { VaultItem, Category, AppSettings, SecurityReport, VaultItemType, VaultNavFilter } from '@/types'
import { LocalStorageService } from '@/services/storage'
import { calculatePasswordStrength } from '@/services/crypto'

const items = ref<VaultItem[]>([])
const categories = ref<Category[]>([])
const settings = ref<AppSettings>(LocalStorageService.getSettings())
const searchQuery = ref('')
const selectedFilter = ref<VaultNavFilter>('dashboard')
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const selectedCompany = ref<string | null>(null)
const selectedDepartment = ref<string | null>(null)
const selectedType = ref<VaultItemType | null>(null)
const selectedItemId = ref<string | null>(null)
const sortBy = ref<'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc' | 'created_desc'>('updated_desc')
const isLoaded = ref(false)

export function useVault() {
  function loadVault() {
    items.value = LocalStorageService.getItems()
    categories.value = LocalStorageService.getCategories()
    settings.value = LocalStorageService.getSettings()
    isLoaded.value = true

    // Select first active item if none selected and in list view
    if (!selectedItemId.value && activeItems.value.length > 0) {
      selectedItemId.value = activeItems.value[0].id
    }
  }

  // Active (non-trash) items
  const activeItems = computed(() => items.value.filter((i) => !i.is_trash))

  // Trash items
  const trashItems = computed(() => items.value.filter((i) => i.is_trash))

  // Unique Companies
  const uniqueCompanies = computed(() => {
    const set = new Set<string>()
    activeItems.value.forEach((i) => {
      if (i.company?.trim()) set.add(i.company.trim())
    })
    return Array.from(set).sort()
  })

  // Unique Departments
  const uniqueDepartments = computed(() => {
    const set = new Set<string>()
    activeItems.value.forEach((i) => {
      if (i.department?.trim()) set.add(i.department.trim())
    })
    return Array.from(set).sort()
  })

  // Unique Teams
  const uniqueTeams = computed(() => {
    const set = new Set<string>()
    activeItems.value.forEach((i) => {
      if (i.team?.trim()) set.add(i.team.trim())
    })
    return Array.from(set).sort()
  })

  // Unique Assigned Persons
  const uniqueAssignedTo = computed(() => {
    const set = new Set<string>()
    activeItems.value.forEach((i) => {
      if (i.assigned_to?.trim()) set.add(i.assigned_to.trim())
    })
    return Array.from(set).sort()
  })

  // All Tags with counts
  const allTagsWithCounts = computed(() => {
    const map = new Map<string, number>()
    activeItems.value.forEach((i) => {
      i.tags?.forEach((t) => {
        const clean = t.trim().toLowerCase()
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1)
        }
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  })

  // Filtered items based on active view, search, category, tag, company, department, type
  const filteredItems = computed(() => {
    let list = items.value

    // View filter
    if (selectedFilter.value === 'trash') {
      list = list.filter((i) => i.is_trash)
    } else {
      list = list.filter((i) => !i.is_trash)

      switch (selectedFilter.value) {
        case 'favorites':
          list = list.filter((i) => i.favorite)
          break
        case 'passwords':
          list = list.filter((i) => i.type === 'password')
          break
        case 'email_accounts':
          list = list.filter((i) => i.type === 'email_account')
          break
        case 'social_accounts':
          list = list.filter((i) => i.type === 'social_account')
          break
        case 'company_accounts':
          list = list.filter((i) => i.type === 'company_account')
          break
        case 'pc_computers':
          list = list.filter((i) => i.type === 'pc_computer')
          break
        case 'servers':
          list = list.filter((i) => i.type === 'server')
          break
        case 'wifi':
          list = list.filter((i) => i.type === 'wifi')
          break
        case 'domains':
          list = list.filter((i) => i.type === 'domain')
          break
        case 'hosting':
          list = list.filter((i) => i.type === 'hosting')
          break
        case 'software_licenses':
          list = list.filter((i) => i.type === 'software_license')
          break
        case 'notes':
          list = list.filter((i) => i.type === 'note')
          break
        case 'identities':
          list = list.filter((i) => i.type === 'identity')
          break
      }
    }

    // Direct Type filter dropdown
    if (selectedType.value) {
      list = list.filter((i) => i.type === selectedType.value)
    }

    // Category filter
    if (selectedCategory.value) {
      list = list.filter((i) => i.category.toLowerCase() === selectedCategory.value?.toLowerCase())
    }

    // Tag filter
    if (selectedTag.value) {
      const tagLower = selectedTag.value.toLowerCase()
      list = list.filter((i) => i.tags?.some((t) => t.toLowerCase() === tagLower))
    }

    // Company filter
    if (selectedCompany.value) {
      list = list.filter((i) => i.company?.toLowerCase() === selectedCompany.value?.toLowerCase())
    }

    // Department filter
    if (selectedDepartment.value) {
      list = list.filter((i) => i.department?.toLowerCase() === selectedDepartment.value?.toLowerCase())
    }

    // Global Search across all fields
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter((item) => {
        const textFields = [
          item.name,
          item.username,
          item.email,
          item.website_url,
          item.account_id,
          item.company,
          item.department,
          item.team,
          item.assigned_to,
          item.location,
          item.provider,
          item.login_url,
          item.recovery_email,
          item.imap_server,
          item.smtp_server,
          item.platform,
          item.profile_url,
          item.role,
          item.access_level,
          item.hostname,
          item.operating_system,
          item.ip_address,
          item.mac_address,
          item.device_type,
          item.admin_account,
          item.protocol,
          item.server_url,
          item.environment,
          item.ssid,
          item.router_ip,
          item.domain_name,
          item.registrar,
          item.nameservers,
          item.dashboard_url,
          item.ftp_host,
          item.ftp_username,
          item.control_panel,
          item.software_name,
          item.vendor,
          item.license_key,
          item.license_type,
          item.content,
          item.full_name,
          item.position,
          item.work_email,
          item.work_phone,
          item.office_address,
          item.category,
          item.notes,
        ]

        const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q))
        if (tagMatch) return true

        return textFields.some((field) => field && field.toString().toLowerCase().includes(q))
      })
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy.value === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy.value === 'name_desc') return b.name.localeCompare(a.name)
      if (sortBy.value === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy.value === 'updated_asc') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      // updated_desc default
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  })

  // Selected item object
  const selectedItem = computed(() => {
    if (!selectedItemId.value) return null
    return items.value.find((i) => i.id === selectedItemId.value) || null
  })

  // Counts for all sections & badges
  const counts = computed(() => {
    const active = activeItems.value
    return {
      all: active.length,
      favorites: active.filter((i) => i.favorite).length,
      passwords: active.filter((i) => i.type === 'password').length,
      email_accounts: active.filter((i) => i.type === 'email_account').length,
      social_accounts: active.filter((i) => i.type === 'social_account').length,
      company_accounts: active.filter((i) => i.type === 'company_account').length,
      pc_computers: active.filter((i) => i.type === 'pc_computer').length,
      servers: active.filter((i) => i.type === 'server').length,
      wifi: active.filter((i) => i.type === 'wifi').length,
      domains: active.filter((i) => i.type === 'domain').length,
      hosting: active.filter((i) => i.type === 'hosting').length,
      software_licenses: active.filter((i) => i.type === 'software_license').length,
      notes: active.filter((i) => i.type === 'note').length,
      identities: active.filter((i) => i.type === 'identity').length,
      categories: categories.value.length,
      tags: allTagsWithCounts.value.length,
      trash: trashItems.value.length,
    }
  })

  // Expiration detection for domains and software licenses
  const expirationAlerts = computed(() => {
    const now = Date.now()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

    const expiringDomains: (VaultItem & { daysRemaining: number; isExpired: boolean })[] = []
    const expiringLicenses: (VaultItem & { daysRemaining: number; isExpired: boolean })[] = []

    activeItems.value.forEach((item) => {
      if (item.type === 'domain' && item.expiration_date) {
        const expTime = new Date(item.expiration_date).getTime()
        if (!isNaN(expTime)) {
          const diffMs = expTime - now
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          if (diffMs <= THIRTY_DAYS_MS) {
            expiringDomains.push({ ...item, daysRemaining, isExpired: diffMs <= 0 })
          }
        }
      }

      if (item.type === 'software_license' && item.expiration_date) {
        const expTime = new Date(item.expiration_date).getTime()
        if (!isNaN(expTime)) {
          const diffMs = expTime - now
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          if (diffMs <= THIRTY_DAYS_MS) {
            expiringLicenses.push({ ...item, daysRemaining, isExpired: diffMs <= 0 })
          }
        }
      }
    })

    return {
      domains: expiringDomains.sort((a, b) => a.daysRemaining - b.daysRemaining),
      licenses: expiringLicenses.sort((a, b) => a.daysRemaining - b.daysRemaining),
      totalAlerts: expiringDomains.length + expiringLicenses.length,
    }
  })

  // Security Report & Analysis across all credential items with passwords
  const securityReport = computed<SecurityReport>(() => {
    // Items that have password credentials
    const passwordItems = activeItems.value.filter((i) => !!i.password)
    const totalPasswords = passwordItems.length

    const weakItems: VaultItem[] = []
    const missingItems: VaultItem[] = []
    const oldItems: VaultItem[] = []
    const passwordUsageMap = new Map<string, VaultItem[]>()

    const now = Date.now()
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

    passwordItems.forEach((item) => {
      const pwd = item.password?.trim() || ''

      if (!pwd) {
        missingItems.push(item)
      } else {
        // Track password repetition
        if (!passwordUsageMap.has(pwd)) {
          passwordUsageMap.set(pwd, [])
        }
        passwordUsageMap.get(pwd)!.push(item)

        // Evaluate strength
        const strength = calculatePasswordStrength(pwd)
        if (strength.score < 60 || pwd.length < 10) {
          weakItems.push(item)
        }

        // Check age (>90 days since update)
        const updatedTime = new Date(item.updated_at).getTime()
        if (!isNaN(updatedTime) && now - updatedTime > NINETY_DAYS_MS) {
          oldItems.push(item)
        }
      }
    })

    // Find reused passwords
    const reusedItems: { password: string; items: VaultItem[] }[] = []
    passwordUsageMap.forEach((matchedItems, pwd) => {
      if (matchedItems.length > 1) {
        reusedItems.push({ password: pwd, items: matchedItems })
      }
    })

    const reusedCount = reusedItems.reduce((acc, curr) => acc + curr.items.length, 0)

    // Calculate score (0 to 100)
    let score = 100
    if (totalPasswords > 0) {
      const weakPenalty = (weakItems.length / totalPasswords) * 40
      const reusedPenalty = (reusedCount / totalPasswords) * 35
      const oldPenalty = (oldItems.length / totalPasswords) * 15
      const missingPenalty = (missingItems.length / totalPasswords) * 20

      score = Math.max(0, Math.round(100 - weakPenalty - reusedPenalty - oldPenalty - missingPenalty))
    }

    return {
      score,
      totalPasswords,
      weakCount: weakItems.length,
      reusedCount,
      oldItemsCount: oldItems.length,
      missingCount: missingItems.length,
      weakItems,
      reusedItems,
      oldItems,
      missingItems,
      expiringDomains: expirationAlerts.value.domains,
      expiringLicenses: expirationAlerts.value.licenses,
    }
  })

  // Recently modified / added
  const recentlyAdded = computed(() => {
    return [...activeItems.value]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  })

  const recentlyModified = computed(() => {
    return [...activeItems.value]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
  })

  // Item Actions
  function saveItem(item: Partial<VaultItem> & { name: string; type: VaultItemType }) {
    const saved = LocalStorageService.upsertItem(item)
    loadVault()
    selectedItemId.value = saved.id
    return saved
  }

  function moveToTrash(id: string) {
    const success = LocalStorageService.moveToTrash(id)
    loadVault()
    if (selectedItemId.value === id) {
      selectedItemId.value = filteredItems.value[0]?.id || null
    }
    return success
  }

  function restoreFromTrash(id: string) {
    const success = LocalStorageService.restoreFromTrash(id)
    loadVault()
    return success
  }

  function permanentlyDelete(id: string) {
    const success = LocalStorageService.permanentlyDelete(id)
    loadVault()
    if (selectedItemId.value === id) {
      selectedItemId.value = filteredItems.value[0]?.id || null
    }
    return success
  }

  function emptyTrash() {
    const count = LocalStorageService.emptyTrash()
    loadVault()
    selectedItemId.value = null
    return count
  }

  function toggleFavorite(id: string) {
    const newState = LocalStorageService.toggleFavorite(id)
    loadVault()
    return newState
  }

  function selectItem(id: string) {
    selectedItemId.value = id
  }

  function setFilter(
    filter: VaultNavFilter,
    category: string | null = null,
    tag: string | null = null,
    company: string | null = null,
    department: string | null = null,
    type: VaultItemType | null = null
  ) {
    selectedFilter.value = filter
    selectedCategory.value = category
    selectedTag.value = tag
    selectedCompany.value = company
    selectedDepartment.value = department
    selectedType.value = type
    // Auto-select first item if possible
    setTimeout(() => {
      if (filteredItems.value.length > 0) {
        selectedItemId.value = filteredItems.value[0].id
      }
    }, 50)
  }

  function clearAllFilters() {
    selectedCategory.value = null
    selectedTag.value = null
    selectedCompany.value = null
    selectedDepartment.value = null
    selectedType.value = null
    searchQuery.value = ''
  }

  // Category Actions
  function addCategory(name: string) {
    const cat = LocalStorageService.addCategory(name)
    categories.value = LocalStorageService.getCategories()
    return cat
  }

  function deleteCategory(id: string) {
    const success = LocalStorageService.deleteCategory(id)
    categories.value = LocalStorageService.getCategories()
    if (selectedCategory.value === id) {
      selectedCategory.value = null
    }
    return success
  }

  // Settings
  function updateSettings(newSettings: Partial<AppSettings>) {
    const updated = LocalStorageService.saveSettings(newSettings)
    settings.value = updated
    applyTheme(updated.theme)
    return updated
  }

  function applyTheme(theme: AppSettings['theme']) {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  // Backup & Restore
  function exportVault() {
    return LocalStorageService.exportVaultData()
  }

  async function exportEncryptedBackup(passphrase: string) {
    return LocalStorageService.exportEncryptedBackup(passphrase)
  }

  async function decryptBackupPayload(content: string, passphrase?: string) {
    return LocalStorageService.decryptBackupPayload(content, passphrase)
  }

  function importVault(data: any, strategy?: any) {
    const result = LocalStorageService.importVaultData(data, strategy)
    loadVault()
    return result
  }

  function resetVault() {
    LocalStorageService.resetToDefaults()
    loadVault()
  }

  return {
    items,
    activeItems,
    trashItems,
    filteredItems,
    categories,
    settings,
    searchQuery,
    selectedFilter,
    selectedCategory,
    selectedTag,
    selectedCompany,
    selectedDepartment,
    selectedType,
    selectedItemId,
    selectedItem,
    sortBy,
    uniqueCompanies,
    uniqueDepartments,
    uniqueTeams,
    uniqueAssignedTo,
    allTagsWithCounts,
    companies: uniqueCompanies,
    departments: uniqueDepartments,
    tags: allTagsWithCounts,
    counts,
    expirationAlerts,
    securityReport,
    recentlyAdded,
    recentlyModified,
    isLoaded,
    loadVault,
    saveItem,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    toggleFavorite,
    selectItem,
    setFilter,
    clearAllFilters,
    addCategory,
    deleteCategory,
    updateSettings,
    applyTheme,
    exportVault,
    exportEncryptedBackup,
    decryptBackupPayload,
    importVault,
    resetVault,
  }
}

