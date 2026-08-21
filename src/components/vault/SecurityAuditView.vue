<script setup lang="ts">
import { computed } from 'vue'
import { useVault } from '@/composables/useVault'
import type { VaultItem } from '@/types'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  KeyRound,
  Edit,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'select', item: VaultItem): void
}>()

const { securityReport } = useVault()

const scoreColorClass = computed(() => {
  const s = securityReport.value.score
  if (s >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
  if (s >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10'
  return 'text-rose-500 border-rose-500/30 bg-rose-500/10'
})

const scoreMessage = computed(() => {
  const s = securityReport.value.score
  if (s >= 85) return 'Your vault has strong security health. Keep credentials updated periodically.'
  if (s >= 65) return 'Good health, but some passwords should be updated to strengthen your security.'
  return 'Vulnerabilities detected. Review weak and reused passwords below immediately.'
})
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck class="w-6 h-6 text-primary" />
          <span>Local Password Security Audit</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Analyzed 100% offline on your device using entropy and repetition models.
        </p>
      </div>
    </div>

    <!-- Security Health Banner -->
    <div class="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row items-center gap-6">
      <!-- Circular/Big Score Badge -->
      <div
        class="w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shrink-0 shadow-inner"
        :class="scoreColorClass"
      >
        <span class="text-3xl font-extrabold tracking-tight">{{ securityReport.score }}%</span>
        <span class="text-[11px] font-semibold uppercase tracking-wider mt-0.5">Security</span>
      </div>

      <div class="flex-1 text-center md:text-left space-y-2">
        <h3 class="text-lg font-bold text-foreground">
          Vault Security Score: {{ securityReport.score }} / 100
        </h3>
        <p class="text-xs text-muted-foreground max-w-xl leading-relaxed">
          {{ scoreMessage }}
        </p>

        <!-- Stats Chips -->
        <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
          <span
            class="px-3 py-1 rounded-full text-xs font-semibold border"
            :class="
              securityReport.weakCount > 0
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            "
          >
            {{ securityReport.weakCount }} Weak
          </span>

          <span
            class="px-3 py-1 rounded-full text-xs font-semibold border"
            :class="
              securityReport.reusedCount > 0
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            "
          >
            {{ securityReport.reusedCount }} Reused
          </span>

          <span
            class="px-3 py-1 rounded-full text-xs font-semibold border"
            :class="
              securityReport.oldItemsCount > 0
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                : 'bg-muted text-muted-foreground border-border'
            "
          >
            {{ securityReport.oldItemsCount }} Old (>90d)
          </span>

          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            {{ securityReport.totalPasswords }} Total Passwords
          </span>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 1: WEAK PASSWORDS ================= -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldAlert class="w-4 h-4 text-rose-500" />
          <span>Weak Passwords ({{ securityReport.weakCount }})</span>
        </h3>
        <span class="text-xs text-muted-foreground">Passwords with low entropy or fewer than 10 characters</span>
      </div>

      <div v-if="securityReport.weakItems.length === 0" class="p-4 rounded-xl border border-border bg-muted/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
        <ShieldCheck class="w-4 h-4" />
        <span>No weak passwords detected! All entries meet minimum strength guidelines.</span>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="item in securityReport.weakItems"
          :key="item.id"
          class="p-4 rounded-xl border border-border bg-card hover:bg-muted/40 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
              <KeyRound class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="text-sm font-semibold text-foreground truncate block">{{ item.name }}</span>
              <span class="text-xs text-muted-foreground font-mono truncate block">{{ item.username || item.email || 'No username' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="emit('edit', item)"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Edit class="w-3.5 h-3.5" />
              <span>Update Password</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 2: REUSED PASSWORDS ================= -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-500" />
          <span>Reused Passwords ({{ securityReport.reusedCount }})</span>
        </h3>
        <span class="text-xs text-muted-foreground">The same password is shared across multiple accounts</span>
      </div>

      <div v-if="securityReport.reusedItems.length === 0" class="p-4 rounded-xl border border-border bg-muted/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
        <ShieldCheck class="w-4 h-4" />
        <span>No password reuse detected! Each account uses unique credentials.</span>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(group, idx) in securityReport.reusedItems"
          :key="idx"
          class="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3"
        >
          <div class="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>Used across {{ group.items.length }} accounts</span>
            <span class="font-mono bg-background/80 px-2 py-0.5 rounded border border-border">••••••••</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
            >
              <div class="min-w-0">
                <span class="text-xs font-semibold text-foreground truncate block">{{ item.name }}</span>
                <span class="text-[11px] text-muted-foreground truncate block">{{ item.username || item.email }}</span>
              </div>
              <button
                @click="emit('edit', item)"
                class="text-xs text-primary hover:underline font-semibold shrink-0 ml-2"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 3: OLD PASSWORDS (>90 DAYS) ================= -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock class="w-4 h-4 text-blue-500" />
          <span>Old Passwords ({{ securityReport.oldItemsCount }})</span>
        </h3>
        <span class="text-xs text-muted-foreground">Not updated in over 90 days</span>
      </div>

      <div v-if="securityReport.oldItems.length === 0" class="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-emerald-500" />
        <span>All passwords have been refreshed recently.</span>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="item in securityReport.oldItems"
          :key="item.id"
          class="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-4"
        >
          <div class="min-w-0">
            <span class="text-xs font-semibold text-foreground truncate block">{{ item.name }}</span>
            <span class="text-[11px] text-muted-foreground">
              Last modified: {{ new Date(item.updated_at).toLocaleDateString() }}
            </span>
          </div>

          <button
            @click="emit('edit', item)"
            class="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Rotate Password
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
