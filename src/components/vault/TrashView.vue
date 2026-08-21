<script setup lang="ts">
import { ref } from 'vue'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import type { VaultItem } from '@/types'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  KeyRound,
  FileText,
  User,
} from '@lucide/vue'

const { trashItems, restoreFromTrash, permanentlyDelete, emptyTrash } = useVault()
const { success, warning } = useToast()

const showConfirmEmpty = ref(false)

function handleRestore(item: VaultItem) {
  restoreFromTrash(item.id)
  success('Item Restored', `"${item.name}" restored to your vault.`)
}

function handlePermanentDelete(item: VaultItem) {
  if (confirm(`Permanently delete "${item.name}"? This action cannot be undone.`)) {
    permanentlyDelete(item.id)
    warning('Item Deleted', `"${item.name}" was permanently removed.`)
  }
}

function handleEmptyTrash() {
  const count = emptyTrash()
  showConfirmEmpty.value = false
  warning('Trash Emptied', `Permanently removed ${count} items.`)
}
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <Trash2 class="w-6 h-6 text-rose-500" />
          <span>Trash ({{ trashItems.length }})</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Items in trash can be restored or permanently removed.
        </p>
      </div>

      <button
        v-if="trashItems.length > 0"
        @click="showConfirmEmpty = true"
        class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition shadow-sm"
      >
        <Trash2 class="w-4 h-4" />
        <span>Empty Trash</span>
      </button>
    </div>

    <!-- Empty Trash State -->
    <div
      v-if="trashItems.length === 0"
      class="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center space-y-3"
    >
      <div class="p-4 rounded-full bg-muted/60 text-muted-foreground">
        <Trash2 class="w-8 h-8" />
      </div>
      <h3 class="text-sm font-semibold text-foreground">Trash is Empty</h3>
      <p class="text-xs text-muted-foreground max-w-xs">
        Deleted items will appear here before being permanently removed.
      </p>
    </div>

    <!-- Trash Items List -->
    <div v-else class="space-y-3">
      <div
        v-for="item in trashItems"
        :key="item.id"
        class="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition flex items-center justify-between gap-4 shadow-sm"
      >
        <div class="flex items-center gap-3.5 min-w-0">
          <div
            class="p-2.5 rounded-lg shrink-0 opacity-70"
            :class="{
              'bg-blue-500/10 text-blue-600': item.type === 'password',
              'bg-amber-500/10 text-amber-600': item.type === 'note',
              'bg-purple-500/10 text-purple-600': item.type === 'identity',
            }"
          >
            <KeyRound v-if="item.type === 'password'" class="w-5 h-5" />
            <FileText v-else-if="item.type === 'note'" class="w-5 h-5" />
            <User v-else class="w-5 h-5" />
          </div>

          <div class="min-w-0">
            <span class="text-sm font-semibold text-foreground line-through opacity-80 truncate block">{{ item.name }}</span>
            <span class="text-xs text-muted-foreground truncate block">
              {{ item.username || item.category }} • Deleted {{ item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : 'recently' }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="handleRestore(item)"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
            title="Restore Item"
          >
            <RotateCcw class="w-3.5 h-3.5 text-emerald-600" />
            <span>Restore</span>
          </button>

          <button
            @click="handlePermanentDelete(item)"
            class="p-2 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-600 transition"
            title="Permanently Delete"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Empty Trash -->
    <div
      v-if="showConfirmEmpty"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div class="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div class="p-2 rounded-xl bg-rose-500/10">
            <AlertTriangle class="w-6 h-6" />
          </div>
          <h3 class="text-base font-bold text-foreground">Empty Trash?</h3>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          This will permanently delete all {{ trashItems.length }} items in the trash. This action is irreversible.
        </p>

        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button
            @click="showConfirmEmpty = false"
            class="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            @click="handleEmptyTrash"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
          >
            Yes, Empty All
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
