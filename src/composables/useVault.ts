import { ref, computed } from 'vue'
import type { VaultItem, Category, AppSettings, SecurityReport, VaultItemType } from '@/types'
import { LocalStorageService } from '@/services/storage'
import { calculatePasswordStrength } from '@/services/crypto'

const items = ref<VaultItem[]>([])
const categories = ref<Category[]>([])
const settings = ref<AppSettings>(LocalStorageService.getSettings())
const searchQuery = ref('')
const selectedFilter = ref<'all' | 'favorites' | 'passwords' | 'notes' | 'identities' | 'trash' | 'security' | 'generator' | 'categories' | 'settings'>('all')
const selectedCategory = ref<string | null>(null)
const selectedItemId = ref<string | null>(null)
const isLoaded = ref(false)

export function useVault() {
  function loadVault() {
    items.value = LocalStorageService.getItems()
    categories.value = LocalStorageService.getCategories()
    settings.value = LocalStorageService.getSettings()
    isLoaded.value = true

    // Select first active item if none selected
    if (!selectedItemId.value && activeItems.value.length > 0) {
      selectedItemId.value = activeItems.value[0].id
    }
  }

  // Active (non-trash) items
  const activeItems = computed(() => items.value.filter((i) => !i.is_trash))

  // Trash items
  const trashItems = computed(() => items.value.filter((i) => i.is_trash))

  // Filtered items based on active view, search, and category
  const filteredItems = computed(() => {
    let list = items.value

    // View filter
    if (selectedFilter.value === 'trash') {
      list = list.filter((i) => i.is_trash)
    } else {
      list = list.filter((i) => !i.is_trash)

      if (selectedFilter.value === 'favorites') {
        list = list.filter((i) => i.favorite)
      } else if (selectedFilter.value === 'passwords') {
        list = list.filter((i) => i.type === 'password')
      } else if (selectedFilter.value === 'notes') {
        list = list.filter((i) => i.type === 'note')
      } else if (selectedFilter.value === 'identities') {
        list = list.filter((i) => i.type === 'identity')
      }
    }

    // Category filter
    if (selectedCategory.value) {
      list = list.filter((i) => i.category.toLowerCase() === selectedCategory.value?.toLowerCase())
    }

    // Search query
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(q)
        const userMatch = item.username?.toLowerCase().includes(q)
        const emailMatch = item.email?.toLowerCase().includes(q)
        const webMatch = item.website_url?.toLowerCase().includes(q)
        const catMatch = item.category.toLowerCase().includes(q)
        const notesMatch = item.notes?.toLowerCase().includes(q)
        const tagsMatch = item.tags?.some((t) => t.toLowerCase().includes(q))
        const idMatch = item.full_name?.toLowerCase().includes(q) || item.company?.toLowerCase().includes(q)
        const contentMatch = item.content?.toLowerCase().includes(q)

        return (
          nameMatch ||
          userMatch ||
          emailMatch ||
          webMatch ||
          catMatch ||
          notesMatch ||
          tagsMatch ||
          idMatch ||
          contentMatch
        )
      })
    }

    return list
  })

  // Selected item object
  const selectedItem = computed(() => {
    if (!selectedItemId.value) return null
    return items.value.find((i) => i.id === selectedItemId.value) || null
  })

  // Counts
  const counts = computed(() => {
    const active = activeItems.value
    return {
      all: active.length,
      favorites: active.filter((i) => i.favorite).length,
      passwords: active.filter((i) => i.type === 'password').length,
      notes: active.filter((i) => i.type === 'note').length,
      identities: active.filter((i) => i.type === 'identity').length,
      trash: trashItems.value.length,
    }
  })

  // Security Report & Analysis
  const securityReport = computed<SecurityReport>(() => {
    const passwordItems = activeItems.value.filter((i) => i.type === 'password')
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

  function setFilter(filter: typeof selectedFilter.value, category: string | null = null) {
    selectedFilter.value = filter
    selectedCategory.value = category
    // Auto-select first item if possible
    setTimeout(() => {
      if (filteredItems.value.length > 0) {
        selectedItemId.value = filteredItems.value[0].id
      }
    }, 50)
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

  function importVault(data: any) {
    const result = LocalStorageService.importVaultData(data)
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
    selectedItemId,
    selectedItem,
    counts,
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
    addCategory,
    deleteCategory,
    updateSettings,
    applyTheme,
    exportVault,
    importVault,
    resetVault,
  }
}
