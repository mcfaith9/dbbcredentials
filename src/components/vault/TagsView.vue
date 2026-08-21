<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVault } from '@/composables/useVault'
import { Tag, Search, Hash } from '@lucide/vue'

const emit = defineEmits<{
  (e: 'select-tag', tagName: string): void
}>()

const { allTagsWithCounts } = useVault()

const searchTagQuery = ref('')

const filteredTags = computed(() => {
  const q = searchTagQuery.value.trim().toLowerCase()
  if (!q) return allTagsWithCounts.value
  return allTagsWithCounts.value.filter((t) => t.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <Tag class="w-6 h-6 text-primary" />
          <span>Tags ({{ allTagsWithCounts.length }})</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Explore and filter company credentials by organized tags.
        </p>
      </div>
    </div>

    <!-- Search Tag Filter -->
    <div class="relative">
      <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        v-model="searchTagQuery"
        type="text"
        placeholder="Filter tags..."
        class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredTags.length === 0"
      class="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center space-y-2"
    >
      <Tag class="w-8 h-8 text-muted-foreground" />
      <h3 class="text-xs font-semibold text-foreground">No tags found</h3>
      <p class="text-[11px] text-muted-foreground">Add tags when creating or editing credentials to organize them here.</p>
    </div>

    <!-- Tag Cloud / Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <button
        v-for="t in filteredTags"
        :key="t.name"
        @click="emit('select-tag', t.name)"
        class="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition flex items-center justify-between text-left group shadow-sm"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
            <Hash class="w-3.5 h-3.5" />
          </div>
          <span class="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {{ t.name }}
          </span>
        </div>

        <span class="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-medium shrink-0 ml-2">
          {{ t.count }}
        </span>
      </button>
    </div>
  </div>
</template>
