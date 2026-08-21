<script setup lang="ts">
import { useVault } from '@/composables/useVault'
import { useClipboard } from '@/composables/useClipboard'
import type { VaultItem, VaultItemType, VaultNavFilter } from '@/types'
import CredentialTypeIcon from './CredentialTypeIcon.vue'
import {
  Building2,
  Server,
  Globe,
  UserRoundCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Clock,
  Copy,
  Sparkles,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'add', type?: VaultItemType): void
  (e: 'select', item: VaultItem): void
  (e: 'navigate', filter: VaultNavFilter): void
  (e: 'open-security'): void
  (e: 'open-generator'): void
}>()

const {
  counts,
  securityReport,
  expirationAlerts,
  recentlyAdded,
  recentlyModified,
} = useVault()

const { copyToClipboard } = useClipboard()

const quickTypes: { type: VaultItemType; label: string; desc: string }[] = [
]
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header with Welcome & Add Item button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-foreground tracking-tight">Credential Vault</h1>
        </div>
        <p class="text-xs text-muted-foreground mt-0.5">
          Centralized, encrypted management of infrastructure, accounts, licenses, and business credentials.
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
          class="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus class="w-4 h-4" />
          <span>New Credential</span>
        </button>
      </div>
    </div>

    <!-- Expiration Warning Banner if any domain or software license is expiring within 30 days -->
    <div
      v-if="expirationAlerts.domains.length > 0 || expirationAlerts.licenses.length > 0"
      class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3 shadow-xs"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Upcoming Expirations (Renewal Required)
            </h3>
            <p class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {{ expirationAlerts.domains.length }} domain(s) and {{ expirationAlerts.licenses.length }} software license(s) expiring within 30 days.
            </p>
          </div>
        </div>

        <button
          @click="emit('navigate', 'domains')"
          class="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
        >
          Review Assets &rarr;
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        <div
          v-for="item in [...expirationAlerts.domains, ...expirationAlerts.licenses].slice(0, 3)"
          :key="item.id"
          class="p-2.5 rounded-xl border border-amber-500/20 bg-card/60 flex items-center justify-between hover:bg-card cursor-pointer transition text-xs"
        >
          <div class="flex items-center gap-2 min-w-0">
            <CredentialTypeIcon :type="item.type" size="sm" />
            <div class="min-w-0">
              <span class="font-bold text-foreground block truncate">{{ item.name }}</span>
              <span class="text-[11px] text-muted-foreground block font-mono">{{ item.expiration_date }}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            Expiring
          </span>
        </div>
      </div>
    </div>

    <!-- Category Counts Matrix -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- Total Records -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-primary/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">All Records</span>
          <div class="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition">
            <Building2 class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">{{ counts.all }}</div>
      </div>

      <!-- Infrastructure -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-purple-500/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Infrastructure</span>
          <div class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Server class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">
          {{ counts.pc_computers + counts.servers + counts.wifi }}
        </div>
      </div>

      <!-- Assets & Licenses -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-amber-500/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Assets & Domains</span>
          <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Globe class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">
          {{ counts.domains + counts.hosting + counts.software_licenses }}
        </div>
      </div>

      <!-- Staff Identities -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-blue-500/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Identities</span>
          <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UserRoundCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-foreground">{{ counts.identities }}</div>
      </div>

      <!-- Security Weak/Reused -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-rose-500/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Weak / Reused</span>
          <div class="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
          {{ securityReport.weakCount + securityReport.reusedCount }}
        </div>
      </div>

      <!-- Vault Security Score -->
      <div
        class="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/50 cursor-pointer transition space-y-2 group shadow-xs"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Security Health</span>
          <div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{{ securityReport.score }}%</div>
      </div>
    </div>

    <!-- Dual Column: Recently Added & Recently Modified -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recently Added -->
      <div class="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus class="w-4 h-4 text-primary" />
            <span>Recently Added</span>
          </h3>
          <button @click="emit('navigate', 'all')" class="text-xs text-primary hover:underline font-medium">
            View All
          </button>
        </div>

        <div v-if="recentlyAdded.length === 0" class="p-6 text-center text-xs text-muted-foreground">
          No records created yet.
        </div>

        <div v-else class="divide-y divide-border/60">
          <div
            v-for="item in recentlyAdded"
            :key="item.id"
            @click="emit('select', item)"
            class="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl cursor-pointer transition"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="p-2 rounded-xl shrink-0 bg-muted/60 text-foreground">
                <CredentialTypeIcon :type="item.type" size="sm" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-foreground truncate">{{ item.name }}</span>
                  <span v-if="item.company" class="px-1.5 py-0.2 rounded text-[10px] bg-primary/10 text-primary">
                    {{ item.company }}
                  </span>
                </div>
                <span class="text-[11px] text-muted-foreground truncate block font-mono">
                  {{ item.username || item.hostname || item.domain_name || item.software_name || item.category }}
                </span>
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
      <div class="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock class="w-4 h-4 text-primary" />
            <span>Recently Modified</span>
          </h3>
          <button @click="emit('navigate', 'all')" class="text-xs text-primary hover:underline font-medium">
            View All
          </button>
        </div>

        <div v-if="recentlyModified.length === 0" class="p-6 text-center text-xs text-muted-foreground">
          No records modified yet.
        </div>

        <div v-else class="divide-y divide-border/60">
          <div
            v-for="item in recentlyModified"
            :key="item.id"
            @click="emit('select', item)"
            class="py-3 flex items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl cursor-pointer transition"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="p-2 rounded-xl shrink-0 bg-muted/60 text-foreground">
                <CredentialTypeIcon :type="item.type" size="sm" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-foreground truncate">{{ item.name }}</span>
                  <span v-if="item.department" class="px-1.5 py-0.2 rounded text-[10px] bg-muted text-muted-foreground">
                    {{ item.department }}
                  </span>
                </div>
                <span class="text-[11px] text-muted-foreground truncate block font-mono">
                  {{ item.username || item.hostname || item.domain_name || item.software_name || item.category }}
                </span>
              </div>
            </div>

            <span class="text-[11px] text-muted-foreground shrink-0 font-mono">
              {{ new Date(item.updated_at).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
