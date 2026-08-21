<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useVault } from '@/composables/useVault'
import { useClipboard } from '@/composables/useClipboard'
import type { VaultItem, VaultItemType, VaultNavFilter } from '@/types'
import AppSidebar from '@/components/AppSidebar.vue'
import ItemDetails from '@/components/vault/ItemDetails.vue'
import ItemDialog from '@/components/vault/ItemDialog.vue'
import DashboardHome from '@/components/vault/DashboardHome.vue'
import PasswordGeneratorModal from '@/components/vault/PasswordGeneratorModal.vue'
import SecurityAuditView from '@/components/vault/SecurityAuditView.vue'
import CategoriesView from '@/components/vault/CategoriesView.vue'
import TagsView from '@/components/vault/TagsView.vue'
import BackupView from '@/components/vault/BackupView.vue'
import TrashView from '@/components/vault/TrashView.vue'
import SettingsView from '@/components/vault/SettingsView.vue'
import EmployeeManagementView from '@/components/employee/EmployeeManagementView.vue'
import CredentialTypeIcon from '@/components/vault/CredentialTypeIcon.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import {
  Search,
  Lock,
  Star,
  X,
  Moon,
  Sun,
  Copy,
  Check,
} from '@lucide/vue'

const { lock } = useAuth()
const { copyToClipboard } = useClipboard()
const {
  filteredItems,
  selectedFilter,
  selectedCategory,
  selectedCompany,
  selectedDepartment,
  selectedTag,
  selectedItemId,
  selectedItem,
  searchQuery,
  sortBy,
  companies,
  departments,
  settings,
  loadVault,
  selectItem,
  setFilter,
  updateSettings,
  toggleFavorite,
} = useVault()

const searchInputRef = ref<HTMLInputElement | null>(null)
const showItemDialog = ref(false)
const showGeneratorModal = ref(false)
const itemToEdit = ref<VaultItem | null>(null)
const initialItemType = ref<VaultItemType>('password')
const copiedRowId = ref<string | null>(null)

function onOpenSearchEvent() {
  setFilter('all')
  searchInputRef.value?.focus()
}

onMounted(() => {
  loadVault()
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('open-vault-search', onOpenSearchEvent)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('open-vault-search', onOpenSearchEvent)
})

function handleGlobalKeydown(e: KeyboardEvent) {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  // Ctrl + K -> Search
  if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }

  // Ctrl + N -> New Item
  if (isCtrlOrCmd && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    openAddItem('password')
  }

  // Ctrl + L -> Lock Vault
  if (isCtrlOrCmd && e.key.toLowerCase() === 'l') {
    e.preventDefault()
    lock()
  }

  // Escape -> close search / modals
  if (e.key === 'Escape') {
    if (showItemDialog.value) showItemDialog.value = false
    if (showGeneratorModal.value) showGeneratorModal.value = false
    if (searchQuery.value) searchQuery.value = ''
  }
}

function openAddItem(type: VaultItemType = 'password') {
  itemToEdit.value = null
  initialItemType.value = type
  showItemDialog.value = true
}

function openEditItem(item: VaultItem) {
  itemToEdit.value = item
  showItemDialog.value = true
}

function handleCategorySelect(catName: string) {
  setFilter('all', catName)
}

function handleTagSelect(tagName: string) {
  setFilter('all', null, null, null, tagName)
}

function handleNavigate(navFilter: VaultNavFilter) {
  setFilter(navFilter)
}

function handleSelectFromDashboard(item: VaultItem) {
  setFilter('all')
  selectItem(item.id)
}

function clearAllFilters() {
  selectedCategory.value = null
  selectedCompany.value = null
  selectedDepartment.value = null
  selectedTag.value = null
  searchQuery.value = ''
}

async function quickCopyPassword(item: VaultItem) {
  const secret = item.password || item.license_key || item.content
  if (!secret) return
  const ok = await copyToClipboard(secret, 'Secret copied to clipboard', true)
  if (ok) {
    copiedRowId.value = item.id
    setTimeout(() => {
      if (copiedRowId.value === item.id) {
        copiedRowId.value = null
      }
    }, 2000)
  }
}

function toggleTheme() {
  const current = settings.value.theme
  const next = current === 'dark' ? 'light' : 'dark'
  updateSettings({ theme: next })
}

const currentViewTitle = computed(() => {
  if (selectedTag.value) return `Tag: #${selectedTag.value}`
  if (selectedCategory.value) return `Category: ${selectedCategory.value}`
  if (selectedCompany.value) return `Company: ${selectedCompany.value}`
  if (selectedDepartment.value) return `Department: ${selectedDepartment.value}`

  const titles: Record<string, string> = {
    all: 'All Credential Records',
    passwords: 'Login Passwords',
    email_accounts: 'Email Accounts',
    social_accounts: 'Social Media Accounts',
    company_accounts: 'Company Accounts',
    pc_computers: 'PC / Computers',
    servers: 'Servers & VPS',
    wifi: 'Wi-Fi Networks',
    domains: 'Domains & DNS',
    hosting: 'Web Hosting & FTP',
    software_licenses: 'Software Licenses',
    notes: 'Secure Notes',
    identities: 'Staff Identities',
    favorites: 'Starred Favorites',
    trash: 'Trash Bin',
  }
  return titles[selectedFilter.value] || 'Vault Records'
})
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-background text-foreground font-sans">
    <!-- Left Navigation Sidebar -->
    <AppSidebar
      @add-item="openAddItem('password')"
      @open-generator="showGeneratorModal = true"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <!-- Top Global Header -->
      <header class="h-14 border-b border-border bg-card px-4 flex items-center justify-between gap-4 shrink-0 select-none">
        <!-- Global Search Box with muted placeholder -->
        <div class="flex-1 max-w-md relative">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search credentials, IPs, domains, licenses, staff... (Ctrl + K)"
            class="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X class="w-3 h-3" />
            </button>
            <kbd class="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-background border border-border rounded shadow-xs">
              Ctrl+K
            </kbd>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-2">
          <!-- Active Filter Chips if any -->
          <div
            v-if="selectedCategory || selectedCompany || selectedDepartment || selectedTag"
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20"
          >
            <span v-if="selectedCompany">Company: <strong>{{ selectedCompany }}</strong></span>
            <span v-else-if="selectedDepartment">Dept: <strong>{{ selectedDepartment }}</strong></span>
            <span v-else-if="selectedCategory">Cat: <strong>{{ selectedCategory }}</strong></span>
            <span v-else-if="selectedTag">Tag: <strong>#{{ selectedTag }}</strong></span>
            <button @click="clearAllFilters" class="hover:text-primary/70" title="Clear Filter">
              <X class="w-3 h-3" />
            </button>
          </div>

          <!-- Theme toggle -->
          <button
            @click="toggleTheme"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition"
            title="Toggle theme"
          >
            <Sun v-if="settings.theme === 'dark'" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>

          <!-- Lock Application -->
          <button
            @click="lock()"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition"
            title="Lock Vault (Ctrl+L)"
          >
            <Lock class="w-4 h-4 text-primary" />
          </button>
        </div>
      </header>

      <!-- Main Body View Area -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- 1. Dedicated Views -->
        <template v-if="selectedFilter === 'dashboard'">
          <DashboardHome
            @add="openAddItem"
            @select="handleSelectFromDashboard"
            @navigate="handleNavigate"
            @open-security="setFilter('security')"
            @open-generator="showGeneratorModal = true"
          />
        </template>

        <template v-else-if="selectedFilter === 'security'">
          <SecurityAuditView
            @edit="openEditItem"
            @select="(item) => { setFilter('all'); selectItem(item.id); }"
          />
        </template>

        <template v-else-if="selectedFilter === 'categories'">
          <CategoriesView @select-category="handleCategorySelect" />
        </template>

        <template v-else-if="selectedFilter === 'tags'">
          <TagsView @select-tag="handleTagSelect" />
        </template>

        <template v-else-if="selectedFilter === 'backup'">
          <BackupView />
        </template>

        <template v-else-if="selectedFilter === 'trash'">
          <TrashView />
        </template>

        <template v-else-if="selectedFilter === 'settings'">
          <SettingsView />
        </template>

        <template v-else-if="selectedFilter === 'identities'">
          <EmployeeManagementView
            @add-employee="openAddItem('identity')"
            @edit-employee="openEditItem"
          />
        </template>

        <!-- 2. Dual Pane Split Vault View (All Items / Passwords / Servers / Domains / etc.) -->
        <template v-else>
          <!-- Left Column: Filtered Items List -->
          <div class="w-80 lg:w-96 border-r border-border flex flex-col bg-card/40 shrink-0 h-full overflow-hidden">
            <!-- List Header & Filtering Bar -->
            <div class="p-3 border-b border-border bg-card/60 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-foreground truncate max-w-[180px]">
                    {{ currentViewTitle }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                    {{ filteredItems.length }}
                  </span>
                </div>

                <!-- Sort dropdown -->
                <div class="flex items-center gap-1">
                  <select
                    v-model="sortBy"
                    class="text-[11px] font-medium bg-muted/50 border border-border rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <option value="updated_desc">Recently Modified</option>
                    <option value="created_desc">Recently Created</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="updated_asc">Oldest Modified</option>
                  </select>
                </div>
              </div>

              <!-- Quick Company / Dept Filters if multiple exist -->
              <div v-if="companies.length > 1 || departments.length > 1" class="flex items-center gap-1.5 pt-1">
                <select
                  v-if="companies.length > 1"
                  v-model="selectedCompany"
                  class="flex-1 text-[10px] bg-muted/40 border border-border rounded px-1.5 py-1 text-muted-foreground focus:outline-none"
                >
                  <option :value="null">All Companies</option>
                  <option v-for="c in companies" :key="c" :value="c">{{ c }}</option>
                </select>

                <select
                  v-if="departments.length > 1"
                  v-model="selectedDepartment"
                  class="flex-1 text-[10px] bg-muted/40 border border-border rounded px-1.5 py-1 text-muted-foreground focus:outline-none"
                >
                  <option :value="null">All Departments</option>
                  <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
            </div>

            <!-- Items List -->
            <div class="flex-1 overflow-y-auto divide-y divide-border/60">
              <!-- Empty state -->
              <div
                v-if="filteredItems.length === 0"
                class="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-3"
              >
                <div class="p-3 rounded-full bg-muted/60 text-muted-foreground">
                  <Search class="w-5 h-5" />
                </div>
                <p>No matching company records found.</p>
                <button
                  @click="openAddItem('password')"
                  class="text-xs text-primary font-bold hover:underline"
                >
                  + Add a new credential
                </button>
              </div>

              <!-- Item Row -->
              <div
                v-for="item in filteredItems"
                :key="item.id"
                @click="selectItem(item.id)"
                class="p-3 flex items-start justify-between gap-2.5 cursor-pointer transition select-none group"
                :class="
                  selectedItemId === item.id
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-muted/40'
                "
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <div class="p-2 rounded-xl shrink-0 mt-0.5 bg-muted/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition">
                    <CredentialTypeIcon :type="item.type" size="sm" />
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-foreground truncate group-hover:text-primary transition">
                        {{ item.name }}
                      </span>
                    </div>

                    <span class="text-[11px] text-muted-foreground truncate block font-mono">
                      {{ item.username || item.hostname || item.domain_name || item.software_name || item.category }}
                    </span>

                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        v-if="item.company"
                        class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {{ item.company }}
                      </span>
                      <span
                        v-if="item.department"
                        class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                      >
                        {{ item.department }}
                      </span>
                      <span
                        v-if="item.expiration_date"
                        class="px-1.5 py-0.2 rounded text-[10px] font-mono text-muted-foreground flex items-center gap-1"
                      >
                        exp: {{ item.expiration_date }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Row Actions (Copy Secret & Star Favorite) -->
                <div class="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    v-if="item.password || item.license_key || item.content"
                    @click.stop="quickCopyPassword(item)"
                    class="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition"
                    title="Quick Copy Secret"
                  >
                    <Check v-if="copiedRowId === item.id" class="w-3.5 h-3.5 text-emerald-600" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>

                  <button
                    @click.stop="toggleFavorite(item.id)"
                    class="p-1 text-muted-foreground hover:text-amber-500 transition"
                    :class="{ 'text-amber-500': item.favorite }"
                    title="Favorite"
                  >
                    <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-500': item.favorite }" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Selected Item Detail -->
          <div class="flex-1 h-full min-w-0 overflow-hidden bg-card">
            <ItemDetails
              :item="selectedItem"
              @edit="openEditItem"
              @delete="() => {}"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Add/Edit Item Modal -->
    <ItemDialog
      v-model:open="showItemDialog"
      :itemToEdit="itemToEdit"
      :initialType="initialItemType"
      @saved="(saved) => selectItem(saved.id)"
    />

    <!-- Standalone Password Generator Modal -->
    <PasswordGeneratorModal
      v-model:open="showGeneratorModal"
    />

    <!-- Toast Notifications Container -->
    <ToastContainer />
  </div>
</template>
