<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useVault } from '@/composables/useVault'
import type { VaultItem, VaultItemType } from '@/types'
import AppSidebar from '@/components/AppSidebar.vue'
import ItemDetails from '@/components/vault/ItemDetails.vue'
import ItemDialog from '@/components/vault/ItemDialog.vue'
import PasswordGeneratorModal from '@/components/vault/PasswordGeneratorModal.vue'
import SecurityAuditView from '@/components/vault/SecurityAuditView.vue'
import CategoriesView from '@/components/vault/CategoriesView.vue'
import TrashView from '@/components/vault/TrashView.vue'
import SettingsView from '@/components/vault/SettingsView.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import {
  Search,
  Plus,
  Lock,
  Star,
  KeyRound,
  FileText,
  User,
  X,
  Sparkles,
  Moon,
  Sun,
} from '@lucide/vue'

const { lock } = useAuth()
const {
  filteredItems,
  selectedFilter,
  selectedCategory,
  selectedItemId,
  selectedItem,
  searchQuery,
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

function onOpenSearchEvent() {
  selectedFilter.value = 'all'
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

function clearCategoryFilter() {
  setFilter(selectedFilter.value, null)
}

function toggleTheme() {
  const current = settings.value.theme
  const next = current === 'dark' ? 'light' : 'dark'
  updateSettings({ theme: next })
}
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
        <!-- Global Search Box -->
        <div class="flex-1 max-w-md relative">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search items, usernames, tags, websites... (Ctrl + K)"
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
          <!-- Active Category Chip if selected -->
          <div
            v-if="selectedCategory"
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20"
          >
            <span>Category: <strong>{{ selectedCategory }}</strong></span>
            <button @click="clearCategoryFilter" class="hover:text-primary/70">
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

          <!-- Password Generator Quick Tool -->
          <button
            @click="showGeneratorModal = true"
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
            title="Password Generator"
          >
            <Sparkles class="w-3.5 h-3.5 text-primary" />
            <span>Generator</span>
          </button>

          <!-- + Add Item Primary Button -->
          <button
            @click="openAddItem('password')"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Item</span>
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
        <template v-if="selectedFilter === 'security'">
          <SecurityAuditView
            @edit="openEditItem"
            @select="(item) => { setFilter('all'); selectItem(item.id); }"
          />
        </template>

        <template v-else-if="selectedFilter === 'categories'">
          <CategoriesView @select-category="handleCategorySelect" />
        </template>

        <template v-else-if="selectedFilter === 'trash'">
          <TrashView />
        </template>

        <template v-else-if="selectedFilter === 'settings'">
          <SettingsView />
        </template>

        <!-- 2. Dual Pane Split Vault View (All Items / Favorites / Passwords / Notes / Cards / Identities) -->
        <template v-else>
          <!-- Left Column: Filtered Items List -->
          <div class="w-80 lg:w-96 border-r border-border flex flex-col bg-card/40 shrink-0 h-full overflow-hidden">
            <!-- List Header -->
            <div class="p-3.5 border-b border-border flex items-center justify-between bg-card/60">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-foreground capitalize">
                  {{ selectedCategory ? selectedCategory : (selectedFilter === 'all' ? 'All Items' : selectedFilter) }}
                </span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                  {{ filteredItems.length }}
                </span>
              </div>

              <!-- Quick Sort / Filter Indicator -->
              <span class="text-[11px] text-muted-foreground">
                Offline Database
              </span>
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
                <p>No matching vault items found.</p>
                <button
                  @click="openAddItem('password')"
                  class="text-xs text-primary font-semibold hover:underline"
                >
                  + Add a new item
                </button>
              </div>

              <!-- Item Row -->
              <div
                v-for="item in filteredItems"
                :key="item.id"
                @click="selectItem(item.id)"
                class="p-3.5 flex items-start justify-between gap-3 cursor-pointer transition select-none group"
                :class="
                  selectedItemId === item.id
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-muted/40'
                "
              >
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="p-2 rounded-xl shrink-0 mt-0.5"
                    :class="{
                      'bg-blue-500/10 text-blue-600 dark:text-blue-400': item.type === 'password',
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400': item.type === 'note',
                      'bg-purple-500/10 text-purple-600 dark:text-purple-400': item.type === 'identity',
                    }"
                  >
                    <KeyRound v-if="item.type === 'password'" class="w-4 h-4" />
                    <FileText v-else-if="item.type === 'note'" class="w-4 h-4" />
                    <User v-else class="w-4 h-4" />
                  </div>

                  <div class="min-w-0">
                    <span class="text-xs font-bold text-foreground truncate block group-hover:text-primary transition">
                      {{ item.name }}
                    </span>
                    <span class="text-[11px] text-muted-foreground truncate block font-mono">
                      {{ item.username || item.email || item.category }}
                    </span>
                  </div>
                </div>

                <!-- Star Favorite toggle -->
                <button
                  @click.stop="toggleFavorite(item.id)"
                  class="p-1 text-muted-foreground hover:text-amber-500 shrink-0 transition"
                  :class="{ 'text-amber-500': item.favorite }"
                >
                  <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-500': item.favorite }" />
                </button>
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
