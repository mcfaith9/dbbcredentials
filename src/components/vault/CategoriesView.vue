<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import {
  Folder,
  Plus,
  Trash2,
  Briefcase,
  User,
  DollarSign,
  Share2,
  ShoppingBag,
  Code,
  Mail,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'select-category', categoryName: string): void
}>()

const { categories, activeItems, addCategory, deleteCategory } = useVault()
const { success, warning } = useToast()

const newCategoryName = ref('')

const categoryStats = computed(() => {
  return categories.value.map((cat) => {
    const count = activeItems.value.filter(
      (item) => item.category.toLowerCase() === cat.name.toLowerCase()
    ).length
    return {
      ...cat,
      count,
    }
  })
})

function handleAdd() {
  const name = newCategoryName.value.trim()
  if (!name) return
  addCategory(name)
  success('Category Created', `Created "${name}" category.`)
  newCategoryName.value = ''
}

function handleDelete(id: string, name: string) {
  if (confirm(`Are you sure you want to delete the category "${name}"? Existing items will keep their category name.`)) {
    deleteCategory(id)
    warning('Category Deleted', `Deleted "${name}".`)
  }
}

function getIconComponent(iconName?: string) {
  switch (iconName) {
    case 'Briefcase':
      return Briefcase
    case 'User':
      return User
    case 'DollarSign':
      return DollarSign
    case 'Share2':
      return Share2
    case 'ShoppingBag':
      return ShoppingBag
    case 'Code':
      return Code
    case 'Mail':
      return Mail
    default:
      return Folder
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <Folder class="w-6 h-6 text-primary" />
          <span>Categories</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Organize your vault items into default and custom categories.
        </p>
      </div>
    </div>

    <!-- Create Category Box -->
    <div class="p-4 rounded-xl border border-border bg-card flex gap-3 shadow-sm">
      <input
        v-model="newCategoryName"
        @keydown.enter.prevent="handleAdd"
        type="text"
        placeholder="Enter new category name..."
        class="flex-1 px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
      />
      <button
        @click="handleAdd"
        class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Add Category</span>
      </button>
    </div>

    <!-- Category Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      <div
        v-for="cat in categoryStats"
        :key="cat.id"
        class="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition flex items-center justify-between group shadow-sm"
      >
        <button
          @click="emit('select-category', cat.name)"
          class="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <div class="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
            <component :is="getIconComponent(cat.icon)" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <span class="text-sm font-semibold text-foreground truncate block group-hover:text-primary transition">
              {{ cat.name }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ cat.count }} {{ cat.count === 1 ? 'item' : 'items' }}
            </span>
          </div>
        </button>

        <button
          v-if="cat.is_custom"
          @click="handleDelete(cat.id, cat.name)"
          class="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition"
          title="Delete Category"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
