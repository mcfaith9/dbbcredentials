<script setup lang="ts">
import { useVault } from '@/composables/useVault'
import { useClipboard } from '@/composables/useClipboard'
import type { VaultItem, VaultItemType } from '@/types'
import {
  KeyRound,
  FileText,
  User,
  Star,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Clock,
  Copy,
  Sparkles,
  ArrowRight,
  Shield,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'add', type?: VaultItemType): void
  (e: 'select', item: VaultItem): void
  (e: 'open-security'): void
  (e: 'open-generator'): void
}>()

const {
  counts,
  securityReport,
  recentlyAdded,
  recentlyModified,
  setFilter,
} = useVault()

const { copyToClipboard } = useClipboard()
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header with Welcome & Add Item button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div>
        <h1 class="text-2xl font-bold text-foreground tracking-tight">Vault Overview</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          Offline encrypted credentials stored locally on your machine.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="emit('open-generator')"
          class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition"
        >
          <Sparkles class="w-3.5 h-3.5 text-primary" />
          <span>Password Generator</span>
        </button>

        <button
          @click="emit('add', 'password')"
          class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus class="w-4 h-4" />
          <span>New Item</span>
        </button>
      </div>
    </div>

    <!-- Metric Cards Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- Total Items -->
      <div
        @click="setFilter('all')"
        class="p-4 rounded-xl border border-border bg-card hover:border-primary/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Total Items</span>
          <div class="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition">
            <KeyRound class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">{{ counts.all }}</div>
      </div>

      <!-- Passwords -->
      <div
        @click="setFilter('passwords')"
        class="p-4 rounded-xl border border-border bg-card hover:border-blue-500/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Logins</span>
          <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <KeyRound class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">{{ counts.passwords }}</div>
      </div>

      <!-- Favorites -->
      <div
        @click="setFilter('favorites')"
        class="p-4 rounded-xl border border-border bg-card hover:border-amber-500/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Favorites</span>
          <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Star class="w-4 h-4 fill-amber-500/20" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">{{ counts.favorites }}</div>
      </div>

      <!-- Weak Passwords -->
      <div
        @click="emit('open-security')"
        class="p-4 rounded-xl border border-border bg-card hover:border-rose-500/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Weak</span>
          <div class="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{{ securityReport.weakCount }}</div>
      </div>

      <!-- Reused Passwords -->
      <div
        @click="emit('open-security')"
        class="p-4 rounded-xl border border-border bg-card hover:border-amber-500/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Reused</span>
          <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{{ securityReport.reusedCount }}</div>
      </div>

      <!-- Security Score -->
      <div
        @click="emit('open-security')"
        class="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/50 cursor-pointer transition space-y-2 group shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Vault Score</span>
          <div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{{ securityReport.score }}%</div>
      </div>
    </div>

    <!-- Security Audit CTA Banner -->
    <div
      class="p-5 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
    >
      <div class="flex items-center gap-3.5">
        <div class="p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Shield class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-foreground">Password Security Health</h3>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ securityReport.weakCount }} weak, {{ securityReport.reusedCount }} reused, and {{ securityReport.oldItemsCount }} old passwords detected.
          </p>
        </div>
      </div>

      <button
        @click="emit('open-security')"
        class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm shrink-0"
      >
        <span>Run Security Audit</span>
        <ArrowRight class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Quick Item Type Creator Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button
        @click="emit('add', 'password')"
        class="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 flex items-center gap-3 transition text-left group"
      >
        <div class="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <KeyRound class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-foreground block">+ Password</span>
          <span class="text-[11px] text-muted-foreground">Website login</span>
        </div>
      </button>

      <button
        @click="emit('add', 'note')"
        class="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 flex items-center gap-3 transition text-left group"
      >
        <div class="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <FileText class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-foreground block">+ Secure Note</span>
          <span class="text-[11px] text-muted-foreground">Keys & memos</span>
        </div>
      </button>

      <button
        @click="emit('add', 'identity')"
        class="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 flex items-center gap-3 transition text-left group"
      >
        <div class="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
          <User class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-foreground block">+ Identity</span>
          <span class="text-[11px] text-muted-foreground">Personal profile</span>
        </div>
      </button>
    </div>

    <!-- Dual Column: Recently Added & Recently Modified -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recently Added -->
      <div class="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus class="w-4 h-4 text-primary" />
            <span>Recently Added</span>
          </h3>
          <button @click="setFilter('all')" class="text-xs text-primary hover:underline font-medium">
            View All
          </button>
        </div>

        <div v-if="recentlyAdded.length === 0" class="p-6 text-center text-xs text-muted-foreground">
          No items added yet.
        </div>

        <div v-else class="divide-y divide-border/60">
          <div
            v-for="item in recentlyAdded"
            :key="item.id"
            @click="emit('select', item)"
            class="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl cursor-pointer transition"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="p-2 rounded-lg shrink-0"
                :class="{
                  'bg-blue-500/10 text-blue-600': item.type === 'password',
                  'bg-amber-500/10 text-amber-600': item.type === 'note',
                  'bg-purple-500/10 text-purple-600': item.type === 'identity',
                }"
              >
                <KeyRound v-if="item.type === 'password'" class="w-4 h-4" />
                <FileText v-else-if="item.type === 'note'" class="w-4 h-4" />
                <User v-else class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-semibold text-foreground truncate block">{{ item.name }}</span>
                <span class="text-[11px] text-muted-foreground truncate block">{{ item.username || item.category }}</span>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="item.password"
                @click.stop="copyToClipboard(item.password, 'Password copied', true)"
                class="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                title="Copy Password"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recently Modified -->
      <div class="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock class="w-4 h-4 text-primary" />
            <span>Recently Modified</span>
          </h3>
          <button @click="setFilter('all')" class="text-xs text-primary hover:underline font-medium">
            View All
          </button>
        </div>

        <div v-if="recentlyModified.length === 0" class="p-6 text-center text-xs text-muted-foreground">
          No items modified yet.
        </div>

        <div v-else class="divide-y divide-border/60">
          <div
            v-for="item in recentlyModified"
            :key="item.id"
            @click="emit('select', item)"
            class="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl cursor-pointer transition"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="p-2 rounded-lg shrink-0"
                :class="{
                  'bg-blue-500/10 text-blue-600': item.type === 'password',
                  'bg-amber-500/10 text-amber-600': item.type === 'note',
                  'bg-purple-500/10 text-purple-600': item.type === 'identity',
                }"
              >
                <KeyRound v-if="item.type === 'password'" class="w-4 h-4" />
                <FileText v-else-if="item.type === 'note'" class="w-4 h-4" />
                <User v-else class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-semibold text-foreground truncate block">{{ item.name }}</span>
                <span class="text-[11px] text-muted-foreground truncate block">{{ item.username || item.category }}</span>
              </div>
            </div>

            <span class="text-[11px] text-muted-foreground shrink-0">
              {{ new Date(item.updated_at).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
