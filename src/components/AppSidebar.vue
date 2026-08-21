<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useVault } from '@/composables/useVault'
import {
  KeyRound,
  LayoutDashboard,
  Star,
  FileText,
  User,
  Trash2,
  Settings,
  ShieldCheck,
  Sparkles,
  Lock,
  Plus,
  Tag,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'add-item'): void
  (e: 'open-generator'): void
}>()

const { user, lock } = useAuth()
const {
  counts,
  selectedFilter,
  selectedCategory,
  categories,
  securityReport,
  setFilter,
} = useVault()

const currentUsername = computed(() => user.value?.username || 'dbadmin')
</script>

<template>
  <aside class="w-64 border-r border-border bg-sidebar flex flex-col h-full shrink-0 select-none text-sidebar-foreground">
    <!-- Sidebar Header: Brand & App Title -->
    <div class="p-4 border-b border-sidebar-border flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
          <KeyRound class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h1 class="text-sm font-bold tracking-tight text-sidebar-foreground truncate">DBB Passwords</h1>
          <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Local Vault</span>
          </div>
        </div>
      </div>

      <button
        @click="lock()"
        class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition"
        title="Lock Application (Ctrl+L)"
      >
        <Lock class="w-4 h-4" />
      </button>
    </div>

    <!-- Quick + Add Item Button -->
    <div class="p-3 border-b border-sidebar-border">
      <button
        @click="emit('add-item')"
        class="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
      >
        <Plus class="w-4 h-4" />
        <span>Add Item (Ctrl+N)</span>
      </button>
    </div>

    <!-- Sidebar Scrollable Navigation -->
    <div class="flex-1 overflow-y-auto p-3 space-y-6">
      <!-- Main Nav Links -->
      <div class="space-y-1">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Vault
        </span>

        <!-- Dashboard -->
        <button
          @click="setFilter('all')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'all' && !selectedCategory
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <LayoutDashboard class="w-4 h-4 text-primary" />
            <span>All Items</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.all }}
          </span>
        </button>

        <!-- Favorites -->
        <button
          @click="setFilter('favorites')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'favorites'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Star class="w-4 h-4 text-amber-500" :class="{ 'fill-amber-500': selectedFilter === 'favorites' }" />
            <span>Favorites</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.favorites }}
          </span>
        </button>

        <!-- Passwords -->
        <button
          @click="setFilter('passwords')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'passwords'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <KeyRound class="w-4 h-4 text-blue-500" />
            <span>Passwords</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.passwords }}
          </span>
        </button>

        <!-- Secure Notes -->
        <button
          @click="setFilter('notes')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'notes'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <FileText class="w-4 h-4 text-amber-500" />
            <span>Secure Notes</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.notes }}
          </span>
        </button>

        <!-- Identities -->
        <button
          @click="setFilter('identities')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'identities'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <User class="w-4 h-4 text-purple-500" />
            <span>Identities</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.identities }}
          </span>
        </button>
      </div>

      <!-- Security & Tools Section -->
      <div class="space-y-1">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Security & Tools
        </span>

        <!-- Security Audit -->
        <button
          @click="setFilter('security')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'security'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <ShieldCheck class="w-4 h-4 text-emerald-500" />
            <span>Security Audit</span>
          </div>
          <span
            v-if="securityReport.weakCount > 0"
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
          >
            {{ securityReport.weakCount }} weak
          </span>
          <span
            v-else
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
          >
            {{ securityReport.score }}%
          </span>
        </button>

        <!-- Password Generator tool -->
        <button
          @click="emit('open-generator')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition"
        >
          <div class="flex items-center gap-2.5">
            <Sparkles class="w-4 h-4 text-indigo-400" />
            <span>Generator Tool</span>
          </div>
        </button>
      </div>

      <!-- Categories Section -->
      <div class="space-y-1">
        <div class="flex items-center justify-between px-2 mb-1">
          <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Categories
          </span>
          <button
            @click="setFilter('categories')"
            class="text-[11px] text-primary hover:underline font-semibold"
          >
            Manage
          </button>
        </div>

        <button
          v-for="cat in categories.slice(0, 5)"
          :key="cat.id"
          @click="setFilter('all', cat.name)"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition"
          :class="
            selectedCategory === cat.name
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Tag class="w-3.5 h-3.5 text-muted-foreground" />
            <span class="truncate">{{ cat.name }}</span>
          </div>
        </button>
      </div>

      <!-- Trash & Settings Section -->
      <div class="space-y-1 pt-2 border-t border-sidebar-border">
        <!-- Trash -->
        <button
          @click="setFilter('trash')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'trash'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Trash2 class="w-4 h-4 text-rose-500" />
            <span>Trash</span>
          </div>
          <span
            v-if="counts.trash > 0"
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono"
          >
            {{ counts.trash }}
          </span>
        </button>

        <!-- Settings -->
        <button
          @click="setFilter('settings')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition"
          :class="
            selectedFilter === 'settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Settings class="w-4 h-4 text-muted-foreground" />
            <span>Settings</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Sidebar Footer: Current User & Lock CTA -->
    <div class="p-3 border-t border-sidebar-border bg-sidebar-accent/30 flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
          {{ currentUsername.slice(0, 2) }}
        </div>
        <div class="min-w-0">
          <span class="text-xs font-bold text-sidebar-foreground truncate block">{{ currentUsername }}</span>
          <span class="text-[10px] text-muted-foreground block truncate">Local Administrator</span>
        </div>
      </div>

      <button
        @click="lock()"
        class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-sidebar-accent transition"
        title="Lock Vault"
      >
        <Lock class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
